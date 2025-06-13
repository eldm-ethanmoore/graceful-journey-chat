import React, { useState, useEffect, useRef } from 'react';
import { WebRTCManager, ConnectionState } from '../sync/WebRTCManager';
import { SignalingService } from '../sync/SignalingService';
import { QRCodeService } from '../sync/QRCodeService';

// Define props for the SyncUI component
interface SyncUIProps {
  isDark: boolean;
  conversationStore: any; // Replace with actual type when available
}

/**
 * SyncUI component for managing device synchronization
 */
export const SyncUI: React.FC<SyncUIProps> = ({ isDark, conversationStore }) => {
  // State for WebRTC connection
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectedPeers, setConnectedPeers] = useState<number>(0);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showQrScanner, setShowQrScanner] = useState<boolean>(false);
  
  // Refs
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webRTCManagerRef = useRef<WebRTCManager | null>(null);
  
  // Initialize WebRTC manager
  useEffect(() => {
    // Create signaling service
    // Note: Replace with actual signaling server URL in production
    const signalingService = new SignalingService('wss://your-signaling-server.com');
    
    // Create WebRTC manager
    const webRTCManager = new WebRTCManager(signalingService, conversationStore);
    
    // Set up event listeners
    webRTCManager.on('connection-state-changed', (state) => {
      setConnectionState(state);
    });
    
    webRTCManager.on('peer-connected', () => {
      setConnectedPeers(webRTCManager.getConnectedPeersCount());
    });
    
    webRTCManager.on('peer-disconnected', () => {
      setConnectedPeers(webRTCManager.getConnectedPeersCount());
    });
    
    webRTCManager.on('sync-started', () => {
      setIsSyncing(true);
    });
    
    webRTCManager.on('sync-completed', () => {
      setIsSyncing(false);
    });
    
    webRTCManager.on('sync-error', (error) => {
      setIsSyncing(false);
      setError(error.message);
    });
    
    // Store reference
    webRTCManagerRef.current = webRTCManager;
    
    // Clean up on unmount
    return () => {
      webRTCManager.disconnect();
    };
  }, [conversationStore]);
  
  // Create a new room and generate QR code
  const handleCreateRoom = async () => {
    try {
      setError(null);
      
      if (!webRTCManagerRef.current) {
        throw new Error('WebRTC manager not initialized');
      }
      
      // Create a new room
      const newRoomId = await webRTCManagerRef.current.createRoom();
      setRoomId(newRoomId);
      
      // Generate QR code
      if (qrCanvasRef.current) {
        await QRCodeService.generateQRCode(newRoomId, qrCanvasRef.current);
      } else {
        const dataUrl = await QRCodeService.generateQRCode(newRoomId) as string;
        setQrCodeUrl(dataUrl);
      }
    } catch (error) {
      console.error('Error creating room:', error);
      setError(error instanceof Error ? error.message : String(error));
    }
  };
  
  // Join a room by scanning a QR code
  const handleScanQRCode = () => {
    setShowQrScanner(true);
    startCamera();
  };
  
  // Start the camera for QR code scanning
  const startCamera = async () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      
      // Start scanning
      scanQRCode();
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Could not access camera. Please check permissions.');
      setShowQrScanner(false);
    }
  };
  
  // Stop the camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  // Scan for QR codes in the video feed
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !webRTCManagerRef.current) {
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) {
      return;
    }
    
    // Check if video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(scanQRCode);
      return;
    }
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data for QR code scanning
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Scan for QR code
    const connectionInfo = QRCodeService.scanQRCode(
      imageData.data,
      imageData.width,
      imageData.height
    );
    
    if (connectionInfo) {
      // Stop scanning
      stopCamera();
      setShowQrScanner(false);
      
      // Join room
      webRTCManagerRef.current.joinRoom(connectionInfo.roomId)
        .then(() => {
          setRoomId(connectionInfo.roomId);
        })
        .catch(error => {
          console.error('Error joining room:', error);
          setError(error instanceof Error ? error.message : String(error));
        });
    } else {
      // Continue scanning
      requestAnimationFrame(scanQRCode);
    }
  };
  
  // Disconnect from all peers
  const handleDisconnect = () => {
    if (webRTCManagerRef.current) {
      webRTCManagerRef.current.disconnect();
      setRoomId(null);
      setQrCodeUrl(null);
    }
  };
  
  // Manually trigger a sync
  const handleTriggerSync = () => {
    if (webRTCManagerRef.current) {
      webRTCManagerRef.current.triggerSync().catch(error => {
        console.error('Error triggering sync:', error);
        setError(error instanceof Error ? error.message : String(error));
      });
    }
  };
  
  // Get connection status text
  const getConnectionStatusText = () => {
    switch (connectionState) {
      case 'disconnected':
        return 'Disconnected';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return `Connected (${connectedPeers} ${connectedPeers === 1 ? 'device' : 'devices'})`;
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };
  
  // Get connection status color
  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'disconnected':
        return isDark ? 'text-gray-400' : 'text-gray-500';
      case 'connecting':
        return isDark ? 'text-yellow-300' : 'text-yellow-600';
      case 'connected':
        return isDark ? 'text-green-400' : 'text-green-600';
      case 'error':
        return isDark ? 'text-red-400' : 'text-red-600';
      default:
        return isDark ? 'text-gray-400' : 'text-gray-500';
    }
  };
  
  return (
    <div className={`p-4 rounded-xl transition-all duration-500 ${
      isDark ? 'bg-[#333333]/60 border-[#2ecc71]/30' : 'bg-[#f0f8ff]/60 border-[#54ad95]/30'
    } backdrop-blur-xl border`}>
      <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Device Synchronization
      </h2>
      
      {/* Connection Status */}
      <div className="mb-4">
        <p className={`text-sm font-medium ${getConnectionStatusColor()}`}>
          Status: {getConnectionStatusText()}
        </p>
        
        {roomId && (
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Room ID: {roomId}
          </p>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <div className={`p-3 mb-4 rounded-lg text-sm ${
          isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
        }`}>
          {error}
        </div>
      )}
      
      {/* QR Code Display */}
      {(roomId && !showQrScanner) && (
        <div className="mb-4">
          <p className={`text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Scan this QR code with another device to connect:
          </p>
          
          <div className={`p-2 rounded-lg inline-block ${
            isDark ? 'bg-white' : 'bg-white'
          }`}>
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
            ) : (
              <canvas ref={qrCanvasRef} className="w-48 h-48" />
            )}
          </div>
        </div>
      )}
      
      {/* QR Code Scanner */}
      {showQrScanner && (
        <div className="mb-4">
          <p className={`text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Point your camera at a QR code to connect:
          </p>
          
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full max-w-sm rounded-lg"
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full hidden"
            />
            
            <button
              onClick={() => {
                stopCamera();
                setShowQrScanner(false);
              }}
              className={`absolute top-2 right-2 p-2 rounded-full ${
                isDark
                  ? 'bg-[#333333]/80 text-white hover:bg-[#444444]'
                  : 'bg-white/80 text-gray-900 hover:bg-gray-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {connectionState === 'disconnected' ? (
          <>
            <button
              onClick={handleCreateRoom}
              className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                isDark
                  ? 'bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30'
                  : 'bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30'
              } backdrop-blur-sm border`}
            >
              Create Connection
            </button>
            
            <button
              onClick={handleScanQRCode}
              className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                isDark
                  ? 'bg-[#03a9f4]/30 hover:bg-[#03a9f4]/40 text-[#03a9f4] border-[#03a9f4]/30'
                  : 'bg-[#0088fb]/20 hover:bg-[#0088fb]/30 text-[#0088fb] border-[#0088fb]/30'
              } backdrop-blur-sm border`}
            >
              Scan QR Code
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing || connectionState !== 'connected'}
              className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                isDark
                  ? 'bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30'
                  : 'bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30'
              } backdrop-blur-sm border disabled:opacity-50`}
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
            
            <button
              onClick={handleDisconnect}
              className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                isDark
                  ? 'bg-red-500/30 hover:bg-red-500/40 text-red-300 border-red-500/30'
                  : 'bg-red-100 hover:bg-red-200 text-red-700 border-red-200'
              } backdrop-blur-sm border`}
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
};
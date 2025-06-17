import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSyncManager } from '../sync/QRCodeSyncManager';
import { ConversationStore } from '../conversationStore';
import { Camera, QrCode, X, RefreshCw, Send, Smartphone } from 'lucide-react';
// Explicitly import the QR code library
import * as QRCodeSync from '@lo-fi/qr-data-sync';

interface QRCodeSyncUIProps {
  isDark: boolean;
  conversationStore: typeof ConversationStore;
}

export const QRCodeSyncUI: React.FC<QRCodeSyncUIProps> = ({ isDark, conversationStore }) => {
  // State
  const [syncMode, setSyncMode] = useState<'send' | 'receive' | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Refs
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const syncManagerRef = useRef<QRCodeSyncManager | null>(null);
  
  // Create DOM elements if they don't exist
  useEffect(() => {
    // Create a fixed ID for the QR code container
    const qrContainerId = 'qr-code-container-fixed';
    let qrContainer = document.getElementById(qrContainerId);
    
    if (!qrContainer) {
      qrContainer = document.createElement('div');
      qrContainer.id = qrContainerId;
      qrContainer.className = 'w-full aspect-square max-w-xs mx-auto mb-4 rounded-lg bg-white flex items-center justify-center overflow-hidden';
      document.body.appendChild(qrContainer);
    }
    
    // Create a fixed ID for the video element
    const videoElementId = 'qr-video-element-fixed';
    let videoElement = document.getElementById(videoElementId) as HTMLVideoElement;
    
    if (!videoElement) {
      videoElement = document.createElement('video');
      videoElement.id = videoElementId;
      videoElement.className = 'w-full max-w-xs mx-auto rounded-lg';
      videoElement.playsInline = true;
      videoElement.autoplay = true;
      videoElement.muted = true;
      document.body.appendChild(videoElement);
    }
    
    // Hide these elements initially
    qrContainer.style.display = 'none';
    videoElement.style.display = 'none';
    
    return () => {
      // Clean up on unmount
      if (qrContainer && qrContainer.parentNode) {
        qrContainer.parentNode.removeChild(qrContainer);
      }
      
      if (videoElement && videoElement.parentNode) {
        // Stop any active streams
        if (videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
        }
        videoElement.parentNode.removeChild(videoElement);
      }
    };
  }, []);
  
  // Initialize QR code sync manager
  useEffect(() => {
    const syncManager = new QRCodeSyncManager(conversationStore);
    
    // Set up event listeners
    syncManager.on('send-started', () => {
      setIsSyncing(true);
      setError(null);
    });
    
    syncManager.on('send-completed', () => {
      setIsSyncing(false);
      setProgress(null);
    });
    
    syncManager.on('send-error', (error) => {
      setIsSyncing(false);
      setError(error.message);
    });
    
    syncManager.on('receive-started', () => {
      setIsSyncing(true);
      setError(null);
    });
    
    syncManager.on('receive-completed', (data) => {
      setIsSyncing(false);
      setProgress(null);
      
      // Process received data
      syncManager.processSyncData(data)
        .then(() => {
          setError(null);
          setSyncMode(null);
        })
        .catch((error) => {
          setError(`Error processing sync data: ${error.message}`);
        });
    });
    
    syncManager.on('receive-error', (error) => {
      setIsSyncing(false);
      setError(error.message);
    });
    
    syncManager.on('frame-sent', (frameIndex, frameCount) => {
      setProgress({ current: frameIndex + 1, total: frameCount });
    });
    
    syncManager.on('frame-received', (framesRead, frameCount) => {
      setProgress({ current: framesRead, total: frameCount });
    });
    
    syncManagerRef.current = syncManager;
    
    // Clean up on unmount
    return () => {
      if (syncManagerRef.current) {
        if (syncManagerRef.current.isSendingInProgress()) {
          syncManagerRef.current.stopSending();
        }
        if (syncManagerRef.current.isReceivingInProgress()) {
          syncManagerRef.current.stopReceiving();
        }
      }
    };
  }, [conversationStore]);
  
  // Start sending data
  const handleStartSending = async () => {
    console.log("Start sending button clicked");
    if (!syncManagerRef.current) {
      setError("QR Code Sync Manager not initialized");
      return;
    }
    
    setError(null);
    setSyncMode('send');
    
    try {
      console.log("Starting QR code sending...");
      
      // Create a new div for QR code rendering
      const qrContainer = document.createElement('div');
      qrContainer.id = 'qr-code-container-fixed';
      qrContainer.style.width = '100%';
      qrContainer.style.height = '100%';
      qrContainer.style.backgroundColor = 'white';
      qrContainer.style.display = 'flex';
      qrContainer.style.justifyContent = 'center';
      qrContainer.style.alignItems = 'center';
      
      // Clear any existing content in the ref
      if (qrCodeRef.current) {
        qrCodeRef.current.innerHTML = '';
        qrCodeRef.current.appendChild(qrContainer);
      } else {
        // Fallback to body if ref not available
        document.body.appendChild(qrContainer);
      }
      
      // Try direct QRCodeSync usage
      try {
        // Get all branches and prepare data
        const branches = await conversationStore.getAllBranches();
        const settings = {
          temperature: localStorage.getItem('temperature'),
          maxTokens: localStorage.getItem('maxTokens'),
          isDark: localStorage.getItem('isDark'),
          selectedModel: localStorage.getItem('selectedModel')
        };

        const syncData = {
          type: 'sync',
          branches,
          settings,
          timestamp: Date.now()
        };
        
        // Use QRCodeSync directly
        await QRCodeSync.send(
          syncData,
          qrContainer,
          {
            onFrameRendered: (frameIndex, frameCount) => {
              setProgress({ current: frameIndex + 1, total: frameCount });
            },
            maxFramesPerSecond: 5,
            frameTextChunkSize: 40,
            qrCodeSize: 300
          }
        );
        
        console.log("QR code sending started directly");
      } catch (directError: any) {
        console.error("Direct QR code sending failed:", directError);
        // Fall back to manager
        const result = await syncManagerRef.current.startSending(qrContainer);
        console.log("QR code sending started via manager:", result);
      }
    } catch (error: any) {
      console.error("Failed to start sending QR codes:", error);
      setError(error.message || 'Failed to start sending QR codes');
    }
  };
  
  // Start receiving data
  const handleStartReceiving = async () => {
    console.log("Start receiving button clicked");
    if (!syncManagerRef.current) {
      setError("QR Code Sync Manager not initialized");
      return;
    }
    
    setError(null);
    setSyncMode('receive');
    
    try {
      console.log("Starting QR code receiving...");
      
      // Create a new video element
      const videoElement = document.createElement('video');
      videoElement.id = 'qr-video-element-fixed';
      videoElement.style.width = '100%';
      videoElement.style.height = 'auto';
      videoElement.style.display = 'block';
      videoElement.playsInline = true;
      videoElement.autoplay = true;
      videoElement.muted = true;
      
      // Clear any existing content in the ref
      if (videoContainerRef.current) {
        videoContainerRef.current.innerHTML = '';
        videoContainerRef.current.appendChild(videoElement);
      } else {
        // Fallback to body if ref not available
        document.body.appendChild(videoElement);
      }
      
      try {
        // Request camera permissions explicitly
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        videoElement.srcObject = stream;
        await videoElement.play();
        console.log("Camera started successfully");
      } catch (cameraError: any) {
        console.error("Camera access error:", cameraError);
        setError(`Camera access error: ${cameraError.message}`);
        return;
      }
      
      // Try direct QRCodeSync usage
      try {
        const receiveResult = await QRCodeSync.receive(
          videoElement,
          {
            onFrameReceived: (framesRead, frameCount) => {
              setProgress({ current: framesRead, total: frameCount });
            },
            maxScansPerSecond: 8,
            preferredCamera: 'environment',
            highlightScanRegion: true
          }
        );
        
        console.log("QR code receiving completed directly:", receiveResult);
        
        if (receiveResult && receiveResult.data) {
          // Process received data
          await syncManagerRef.current.processSyncData(receiveResult.data);
          setError(null);
          setSyncMode(null);
        }
      } catch (directError: any) {
        console.error("Direct QR code receiving failed:", directError);
        // Fall back to manager
        const result = await syncManagerRef.current.startReceiving(videoElement);
        console.log("QR code receiving started via manager:", result);
      }
    } catch (error: any) {
      console.error("Failed to start receiving QR codes:", error);
      setError(error.message || 'Failed to start receiving QR codes');
    }
  };
  
  // Cancel sync
  const handleCancel = () => {
    if (!syncManagerRef.current) return;
    
    if (syncMode === 'send' && syncManagerRef.current.isSendingInProgress()) {
      syncManagerRef.current.stopSending();
    } else if (syncMode === 'receive' && syncManagerRef.current.isReceivingInProgress()) {
      syncManagerRef.current.stopReceiving();
    }
    
    // Hide the fixed elements
    const qrContainer = document.getElementById('qr-code-container-fixed');
    if (qrContainer) {
      qrContainer.style.display = 'none';
    }
    
    const videoElement = document.getElementById('qr-video-element-fixed') as HTMLVideoElement;
    if (videoElement) {
      // Stop any active streams
      if (videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
      videoElement.style.display = 'none';
    }
    
    setSyncMode(null);
    setProgress(null);
  };
  
  return (
    <div className={`p-4 rounded-xl transition-all duration-500 ${
      isDark ? 'bg-[#333333]/60 border-[#2ecc71]/30' : 'bg-[#f0f8ff]/60 border-[#54ad95]/30'
    } backdrop-blur-xl border`}>
      <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        QR Code Synchronization
      </h2>
      
      {/* Error Message */}
      {error && (
        <div className={`p-3 mb-4 rounded-lg text-sm ${
          isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
        }`}>
          {error}
        </div>
      )}
      
      {/* Sync Mode Selection */}
      {!syncMode && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleStartSending}
            className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
              isDark
                ? 'bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30'
                : 'bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30'
            } backdrop-blur-sm border flex items-center justify-center gap-2`}
          >
            <Send className="w-4 h-4" />
            Send Data
          </button>
          
          <button
            onClick={handleStartReceiving}
            className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
              isDark
                ? 'bg-[#03a9f4]/30 hover:bg-[#03a9f4]/40 text-[#03a9f4] border-[#03a9f4]/30'
                : 'bg-[#0088fb]/20 hover:bg-[#0088fb]/30 text-[#0088fb] border-[#0088fb]/30'
            } backdrop-blur-sm border flex items-center justify-center gap-2`}
          >
            <Camera className="w-4 h-4" />
            Receive Data
          </button>
        </div>
      )}
      
      {/* Send Mode */}
      {syncMode === 'send' && (
        <div className="mb-4">
          <p className={`text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Show this QR code to the receiving device:
          </p>
          
          {/* QR Code Display */}
          <div
            ref={qrCodeRef}
            className={`w-full aspect-square max-w-xs mx-auto mb-4 rounded-lg ${
              isDark ? 'bg-white' : 'bg-white'
            } flex items-center justify-center overflow-hidden`}
          >
            {/* This will be replaced with the actual QR code when sending */}
            {!isSyncing && (
              <QrCode className="w-16 h-16 text-gray-300" />
            )}
          </div>
          
          {/* Progress */}
          {progress && (
            <div className="mb-4 text-center">
              <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Sending frame {progress.current} of {progress.total}
              </p>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                <div 
                  className={`h-2 rounded-full ${isDark ? 'bg-[#2ecc71]' : 'bg-[#54ad95]'}`}
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Cancel Button */}
          <button
            onClick={handleCancel}
            className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
              isDark
                ? 'bg-red-500/30 hover:bg-red-500/40 text-red-300 border-red-500/30'
                : 'bg-red-100 hover:bg-red-200 text-red-700 border-red-200'
            } backdrop-blur-sm border flex items-center justify-center gap-2`}
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      )}
      
      {/* Receive Mode */}
      {syncMode === 'receive' && (
        <div className="mb-4">
          <p className={`text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Point your camera at the QR code on the sending device:
          </p>
          
          {/* Camera Feed */}
          <div className="relative mb-4">
            <div
              ref={videoContainerRef}
              className="relative w-full max-w-xs mx-auto rounded-lg overflow-hidden"
            >
              {/* This will be replaced with the actual video when receiving */}
              {!isSyncing && (
                <div className="aspect-video bg-gray-900 flex items-center justify-center">
                  <Camera className="w-16 h-16 text-gray-700" />
                </div>
              )}
            </div>
            
            {/* Cancel Button */}
            <button
              onClick={handleCancel}
              className={`absolute top-2 right-2 p-2 rounded-full ${
                isDark
                  ? 'bg-[#333333]/80 text-white hover:bg-[#444444]'
                  : 'bg-white/80 text-gray-900 hover:bg-gray-200'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress */}
          {progress && (
            <div className="mb-4 text-center">
              <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Received {progress.current} of {progress.total} frames
              </p>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                <div 
                  className={`h-2 rounded-full ${isDark ? 'bg-[#03a9f4]' : 'bg-[#0088fb]'}`}
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Instructions */}
      {!syncMode && (
        <div className={`mt-4 p-3 rounded-lg text-xs ${
          isDark ? 'bg-[#333333]/80 text-gray-300' : 'bg-[#f0f8ff]/80 text-gray-700'
        }`}>
          <p className="mb-2 font-medium">How to sync:</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>On the sending device, click "Send Data"</li>
            <li>On the receiving device, click "Receive Data"</li>
            <li>Point the receiving device's camera at the QR code</li>
            <li>Wait for all frames to be transferred</li>
          </ol>
        </div>
      )}
    </div>
  );
};
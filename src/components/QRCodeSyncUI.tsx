import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSyncManager } from '../sync/QRCodeSyncManager';
import { ConversationStore } from '../conversationStore';
import { Camera, QrCode, X, RefreshCw, Send } from 'lucide-react';
import { isQRCodeSyncAvailable } from '../utils/qrCodeSyncInit';
// We'll use the global QRCodeSync object instead of importing it
// This ensures we're using the one loaded from the CDN

interface QRCodeSyncUIProps {
  isDark: boolean;
  qrCodeSyncManager: QRCodeSyncManager;
  isSyncing: boolean;
  isAvailable: boolean;
  error: string | null;
}

export const QRCodeSyncUI: React.FC<QRCodeSyncUIProps> = ({
  isDark,
  qrCodeSyncManager,
  isSyncing: externalIsSyncing,
  isAvailable: externalIsAvailable,
  error: externalError
}) => {
  // State
  const [syncMode, setSyncMode] = useState<'send' | 'receive' | null>(null);
  const [internalIsSyncing, setInternalIsSyncing] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Use external state if provided, otherwise use internal state
  const effectiveIsSyncing = externalIsSyncing !== undefined ? externalIsSyncing : internalIsSyncing;
  const effectiveError = externalError || internalError;
  const [isQRCodeAvailable, setIsQRCodeAvailable] = useState<boolean>(externalIsAvailable !== undefined ? externalIsAvailable : true);
  
  // Refs
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const syncManagerRef = useRef<QRCodeSyncManager | null>(qrCodeSyncManager || null);
  
  // Check if QR code functionality is available
  useEffect(() => {
    // Check if QRCodeSync is available using our utility function
    const hasQRCodeSync = isQRCodeSyncAvailable();
    
    console.log('QRCodeSyncUI: QRCodeSync availability check:', { hasQRCodeSync });
    setIsQRCodeAvailable(hasQRCodeSync);
  }, []);
  
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
  
  // Use the provided QR code sync manager
  useEffect(() => {
    if (!qrCodeSyncManager) return;
    
    // Set up event listeners
    qrCodeSyncManager.on('send-started', () => {
      setInternalIsSyncing(true);
      setInternalError(null);
    });
    
    qrCodeSyncManager.on('send-completed', () => {
      setInternalIsSyncing(false);
      setProgress(null);
    });
    
    qrCodeSyncManager.on('send-error', (error) => {
      setInternalIsSyncing(false);
      setInternalError(error.message);
    });
    
    qrCodeSyncManager.on('receive-started', () => {
      setInternalIsSyncing(true);
      setInternalError(null);
    });
    
    qrCodeSyncManager.on('receive-completed', (data) => {
      setInternalIsSyncing(false);
      setProgress(null);
      
      // Process received data
      qrCodeSyncManager.processSyncData(data)
        .then(() => {
          setInternalError(null);
          setSyncMode(null);
        })
        .catch((error) => {
          setInternalError(`Error processing sync data: ${error.message}`);
        });
    });
    
    qrCodeSyncManager.on('receive-error', (error) => {
      setInternalIsSyncing(false);
      setInternalError(error.message);
    });
    
    qrCodeSyncManager.on('frame-sent', (frameIndex, frameCount) => {
      setProgress({ current: frameIndex + 1, total: frameCount });
    });
    
    qrCodeSyncManager.on('frame-received', (framesRead, frameCount) => {
      setProgress({ current: framesRead, total: frameCount });
    });
    
    syncManagerRef.current = qrCodeSyncManager;
    
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
  }, [qrCodeSyncManager]);
  
  // Start sending data
  const handleStartSending = async () => {
    console.log("Start sending button clicked");
    if (!syncManagerRef.current) {
      setInternalError("QR Code Sync Manager not initialized");
      return;
    }
    
    setInternalError(null);
    setSyncMode('send');
    
    try {
      console.log("Starting QR code sending...");
      
      // Get or create the QR code container
      let qrContainer = document.getElementById('qr-code-container-fixed');
      
      if (!qrContainer) {
        // Create a new div for QR code rendering
        qrContainer = document.createElement('div');
        qrContainer.id = 'qr-code-container-fixed';
        qrContainer.style.width = '300px';
        qrContainer.style.height = '300px';
        qrContainer.style.backgroundColor = 'white';
        qrContainer.style.display = 'flex';
        qrContainer.style.justifyContent = 'center';
        qrContainer.style.alignItems = 'center';
        qrContainer.style.margin = '0 auto';
        qrContainer.style.position = 'relative';
        
        // Append to the document body
        document.body.appendChild(qrContainer);
      } else {
        // Clear any existing content
        qrContainer.innerHTML = '';
        qrContainer.style.display = 'flex';
      }
      
      // Also update the ref
      if (qrCodeRef.current) {
        qrCodeRef.current.innerHTML = '';
        // Create a clone of the container to display in the UI
        const displayContainer = document.createElement('div');
        displayContainer.style.width = '100%';
        displayContainer.style.height = '100%';
        displayContainer.style.backgroundColor = 'white';
        displayContainer.style.display = 'flex';
        displayContainer.style.justifyContent = 'center';
        displayContainer.style.alignItems = 'center';
        displayContainer.textContent = 'QR Code is being generated...';
        qrCodeRef.current.appendChild(displayContainer);
      }
      
      // Check if QRCodeSync is available
      if (isQRCodeAvailable) {
        try {
          // Get all branches and prepare data
          const branches = await qrCodeSyncManager.conversationStore.getAllBranches();
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
          
          // Ensure QRCode is available before sending
          if (typeof window.QRCode === 'undefined') {
            console.warn('QRCodeSyncUI: QRCode not available, waiting for it to load...');
            // Wait a bit for QRCode to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check again
            if (typeof window.QRCode === 'undefined') {
              throw new Error('QRCode library is not available. Please ensure it is properly loaded.');
            }
          }
          
          // Use QRCodeSync from the global window object
          await window.QRCodeSync.send(
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
      } else {
        // QRCodeSync not available, use manager directly
        console.log("QRCodeSync not available, using manager directly");
        const result = await syncManagerRef.current.startSending(qrContainer);
        console.log("QR code sending started via manager:", result);
      }
    } catch (error: any) {
      console.error("Failed to start sending QR codes:", error);
      setInternalError(error.message || 'Failed to start sending QR codes');
    }
  };
  
  // Start receiving data
  const handleStartReceiving = async () => {
    console.log("Start receiving button clicked");
    if (!syncManagerRef.current) {
      setInternalError("QR Code Sync Manager not initialized");
      return;
    }
    
    setInternalError(null);
    setSyncMode('receive');
    
    try {
      console.log("Starting QR code receiving...");
      
      // Get or create the video element
      let videoElement = document.getElementById('qr-video-element-fixed') as HTMLVideoElement;
      
      if (!videoElement) {
        // Create a new video element
        videoElement = document.createElement('video');
        videoElement.id = 'qr-video-element-fixed';
        videoElement.style.width = '100%';
        videoElement.style.height = 'auto';
        videoElement.style.maxWidth = '300px';
        videoElement.style.margin = '0 auto';
        videoElement.style.display = 'block';
        videoElement.playsInline = true;
        videoElement.autoplay = true;
        videoElement.muted = true;
        
        // Append to the document body
        document.body.appendChild(videoElement);
      } else {
        // Reset the video element
        if (videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
        }
        videoElement.srcObject = null;
        videoElement.style.display = 'block';
      }
      
      // Also update the ref
      if (videoContainerRef.current) {
        videoContainerRef.current.innerHTML = '';
        // Create a message to display in the UI
        const displayMessage = document.createElement('div');
        displayMessage.style.width = '100%';
        displayMessage.style.padding = '20px';
        displayMessage.style.textAlign = 'center';
        displayMessage.textContent = 'Camera is being initialized...';
        videoContainerRef.current.appendChild(displayMessage);
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
        setInternalError(`Camera access error: ${cameraError.message}`);
        return;
      }
      
      // Check if QRCodeSync is available
      if (isQRCodeAvailable) {
        try {
          // Ensure QRCode is available before receiving
          if (typeof window.QRCode === 'undefined') {
            console.warn('QRCodeSyncUI: QRCode not available, waiting for it to load...');
            // Wait a bit for QRCode to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check again
            if (typeof window.QRCode === 'undefined') {
              throw new Error('QRCode library is not available. Please ensure it is properly loaded.');
            }
          }
          
          const receiveResult = await window.QRCodeSync.receive(
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
            setInternalError(null);
            setSyncMode(null);
          }
        } catch (directError: any) {
          console.error("Direct QR code receiving failed:", directError);
          // Fall back to manager
          const result = await syncManagerRef.current.startReceiving(videoElement);
          console.log("QR code receiving started via manager:", result);
        }
      } else {
        // QRCodeSync not available, use manager directly
        console.log("QRCodeSync not available, using manager directly");
        const result = await syncManagerRef.current.startReceiving(videoElement);
        console.log("QR code receiving started via manager:", result);
      }
    } catch (error: any) {
      console.error("Failed to start receiving QR codes:", error);
      setInternalError(error.message || 'Failed to start receiving QR codes');
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
      {effectiveError && (
        <div className={`p-3 mb-4 rounded-lg text-sm ${
          isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
        }`}>
          {effectiveError}
        </div>
      )}
      
      {/* QR Code Availability Warning */}
      {!isQRCodeAvailable && !syncMode && (
        <div className={`p-3 mb-4 rounded-lg text-sm ${
          isDark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
        }`}>
          <p>QR Code library not fully loaded. Using simplified mode.</p>
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
            {!effectiveIsSyncing && (
              <div className="flex flex-col items-center justify-center">
                <QrCode className="w-16 h-16 text-gray-300" />
                <p className="text-xs text-gray-500 mt-2">QR Code Sync</p>
              </div>
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
              {!iveIsSyncing && (
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
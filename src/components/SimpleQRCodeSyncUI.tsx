import React, { useState, useRef, useEffect } from 'react';
import { SimpleQRCodeSync } from '../utils/SimpleQRCodeSync';
import { ConversationStore } from '../conversationStore';
import { Camera, QrCode, X, Send } from 'lucide-react';

interface SimpleQRCodeSyncUIProps {
  isDark: boolean;
  conversationStore: typeof ConversationStore;
}

export const SimpleQRCodeSyncUI: React.FC<SimpleQRCodeSyncUIProps> = ({ isDark, conversationStore }) => {
  // State
  const [syncMode, setSyncMode] = useState<'send' | 'receive' | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Refs
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const syncManagerRef = useRef<SimpleQRCodeSync | null>(null);
  
  // Initialize QR code sync manager
  useEffect(() => {
    const syncManager = new SimpleQRCodeSync(conversationStore);
    
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
    console.log("SimpleQRCodeSyncUI: Start sending button clicked");
    if (!syncManagerRef.current) {
      setError("QR Code Sync Manager not initialized");
      return;
    }
    
    setError(null);
    setSyncMode('send');
    
    try {
      console.log("SimpleQRCodeSyncUI: Starting QR code sending...");
      
      // Create a container for QR code rendering
      const qrContainer = document.getElementById('qr-code-container-fixed');
      
      if (qrContainer) {
        // Clear existing content
        qrContainer.innerHTML = '';
        qrContainer.style.display = 'flex';
      } else {
        // Create a new container if it doesn't exist
        const newContainer = document.createElement('div');
        newContainer.id = 'qr-code-container-fixed';
        newContainer.style.width = '300px';
        newContainer.style.height = '300px';
        newContainer.style.backgroundColor = 'white';
        newContainer.style.display = 'flex';
        newContainer.style.justifyContent = 'center';
        newContainer.style.alignItems = 'center';
        newContainer.style.margin = '0 auto';
        newContainer.style.position = 'relative';
        document.body.appendChild(newContainer);
      }
      
      // Create a canvas for QR code rendering
      const qrCanvas = document.createElement('canvas');
      qrCanvas.width = 300;
      qrCanvas.height = 300;
      
      // Clear any existing content in the ref
      if (qrCodeRef.current) {
        qrCodeRef.current.innerHTML = '';
        qrCodeRef.current.appendChild(qrCanvas.cloneNode(true));
      }
      
      // Get the container again to ensure it exists
      const targetContainer = document.getElementById('qr-code-container-fixed');
      if (targetContainer) {
        targetContainer.appendChild(qrCanvas);
        
        // Start sending
        await syncManagerRef.current.startSending(targetContainer);
        console.log("SimpleQRCodeSyncUI: QR code sending started");
      } else {
        throw new Error("QR code container not found");
      }
    } catch (error: any) {
      console.error("SimpleQRCodeSyncUI: Failed to start sending QR codes:", error);
      setError(error.message || 'Failed to start sending QR codes');
    }
  };
  
  // Start receiving data
  const handleStartReceiving = async () => {
    console.log("SimpleQRCodeSyncUI: Start receiving button clicked");
    if (!syncManagerRef.current) {
      setError("QR Code Sync Manager not initialized");
      return;
    }
    
    setError(null);
    setSyncMode('receive');
    
    try {
      console.log("SimpleQRCodeSyncUI: Starting QR code receiving...");
      
      // Get or create the video element
      let videoElement = document.getElementById('qr-video-element-fixed') as HTMLVideoElement;
      
      if (videoElement) {
        // Reset the video element
        if (videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
        }
        videoElement.srcObject = null;
        videoElement.style.display = 'block';
      } else {
        // Create a new video element
        videoElement = document.createElement('video');
        videoElement.id = 'qr-video-element-fixed';
        videoElement.width = 300;
        videoElement.height = 300;
        videoElement.style.display = 'block';
        videoElement.style.maxWidth = '300px';
        videoElement.style.margin = '0 auto';
        videoElement.playsInline = true;
        videoElement.autoplay = true;
        videoElement.muted = true;
        document.body.appendChild(videoElement);
      }
      
      // Clear any existing content in the ref
      if (videoContainerRef.current) {
        videoContainerRef.current.innerHTML = '';
        // Create a clone for display in the UI
        const displayVideo = document.createElement('div');
        displayVideo.style.width = '100%';
        displayVideo.style.height = '200px';
        displayVideo.style.backgroundColor = '#333';
        displayVideo.style.display = 'flex';
        displayVideo.style.justifyContent = 'center';
        displayVideo.style.alignItems = 'center';
        displayVideo.textContent = 'Camera is initializing...';
        videoContainerRef.current.appendChild(displayVideo);
      }
      
      try {
        // Request camera permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        videoElement.srcObject = stream;
        await videoElement.play();
        console.log("SimpleQRCodeSyncUI: Camera started successfully");
        
        // Start receiving
        await syncManagerRef.current.startReceiving(videoElement);
        console.log("SimpleQRCodeSyncUI: QR code receiving started");
      } catch (cameraError: any) {
        console.error("SimpleQRCodeSyncUI: Camera access error:", cameraError);
        setError(`Camera access error: ${cameraError.message}`);
      }
    } catch (error: any) {
      console.error("SimpleQRCodeSyncUI: Failed to start receiving QR codes:", error);
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
    
    setSyncMode(null);
    setProgress(null);
  };
  
  return (
    <div className={`p-4 rounded-xl transition-all duration-500 ${
      isDark ? 'bg-[#333333]/60 border-[#2ecc71]/30' : 'bg-[#f0f8ff]/60 border-[#54ad95]/30'
    } backdrop-blur-xl border`}>
      <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Simple QR Code Sync
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
            <li>Wait for the data to be transferred</li>
          </ol>
        </div>
      )}
    </div>
  );
};
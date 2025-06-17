import React, { useState, useRef, useEffect } from 'react';
import { Camera, X } from 'lucide-react';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isDark?: boolean;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ 
  onScan, 
  onClose,
  isDark = false
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start the camera when the component mounts
  useEffect(() => {
    startCamera();
    
    // Clean up when the component unmounts
    return () => {
      stopCamera();
    };
  }, []);

  // Start the camera
  const startCamera = async () => {
    try {
      setError(null);
      
      // Check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera access');
      }
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      // Store the stream for later cleanup
      streamRef.current = stream;
      
      // Set the video source
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Start scanning
        setIsScanning(true);
        scanQRCode();
      }
    } catch (error: any) {
      console.error('Error starting camera:', error);
      setError(error.message || 'Failed to access camera');
      setIsScanning(false);
    }
  };

  // Stop the camera
  const stopCamera = () => {
    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear the video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
  };

  // Scan for QR codes
  const scanQRCode = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // In a real implementation, we would use a QR code scanning library here
    // For this simplified version, we'll just simulate a scan after a delay
    
    // Simulate QR code detection after 3 seconds
    setTimeout(() => {
      if (isScanning) {
        // Simulate a successful scan
        const simulatedData = JSON.stringify({
          type: 'sync',
          timestamp: Date.now(),
          message: 'This is a simulated QR code scan'
        });
        
        // Call the onScan callback with the data
        onScan(simulatedData);
        
        // Stop scanning
        stopCamera();
      }
    }, 3000);
    
    // Continue scanning if still active
    if (isScanning) {
      requestAnimationFrame(scanQRCode);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
      isDark ? 'bg-black/70' : 'bg-gray-800/70'
    }`}>
      <div className={`relative w-full max-w-md rounded-xl overflow-hidden ${
        isDark ? 'bg-[#333333] text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium">Scan QR Code</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Camera View */}
        <div className="relative aspect-square w-full bg-black">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
              <div className="bg-red-500/90 text-white p-4 rounded-lg max-w-xs">
                <p>{error}</p>
                <button 
                  onClick={startCamera}
                  className="mt-3 px-4 py-2 bg-white text-red-500 rounded-lg font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full opacity-0"
              />
              
              {/* Scanning Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2/3 h-2/3 border-2 border-white/70 rounded-lg">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#2ecc71] rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#2ecc71] rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#2ecc71] rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#2ecc71] rounded-br-lg" />
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Instructions */}
        <div className="p-4">
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Position the QR code within the frame to scan it automatically.
          </p>
        </div>
      </div>
    </div>
  );
};
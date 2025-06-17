import React, { useEffect, useRef } from 'react';
import { qrCodeService } from '../sync/QRCodeService';
import { X } from 'lucide-react';

interface QRCodeDisplayProps {
  data: string;
  onClose: () => void;
  isDark?: boolean;
  title?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  data,
  onClose,
  isDark = false,
  title = 'Scan this QR code'
}) => {
  const qrCodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create the QR code when the component mounts
    if (qrCodeRef.current) {
      qrCodeService.createQRCode(data, qrCodeRef.current);
    }

    // Clean up when the component unmounts
    return () => {
      qrCodeService.clearQRCode();
    };
  }, [data]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
      isDark ? 'bg-black/70' : 'bg-gray-800/70'
    }`}>
      <div className={`relative w-full max-w-md rounded-xl overflow-hidden ${
        isDark ? 'bg-[#333333] text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* QR Code */}
        <div className="p-6 flex flex-col items-center">
          <div 
            ref={qrCodeRef}
            className="w-64 h-64 bg-white rounded-lg flex items-center justify-center"
          >
            {/* QR code will be rendered here */}
          </div>
          
          <p className={`mt-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Point your device's camera at the QR code to scan it.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * A simplified QR code display component that doesn't use a modal
 */
export const SimpleQRCodeDisplay: React.FC<{
  data: string;
  className?: string;
}> = ({ data, className = '' }) => {
  const qrCodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create the QR code when the component mounts
    if (qrCodeRef.current) {
      qrCodeService.createQRCode(data, qrCodeRef.current);
    }

    // Clean up when the component unmounts
    return () => {
      qrCodeService.clearQRCode();
    };
  }, [data]);

  return (
    <div 
      ref={qrCodeRef}
      className={`w-full aspect-square bg-white rounded-lg flex items-center justify-center ${className}`}
    >
      {/* QR code will be rendered here */}
    </div>
  );
};
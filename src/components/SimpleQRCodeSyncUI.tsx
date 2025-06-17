import React, { useState, useEffect } from 'react';
import { ConversationStore } from '../conversationStore';
import { Camera, Send, X } from 'lucide-react';
import { qrCodeService } from '../sync/QRCodeService';
import { QRCodeScanner } from './QRCodeScanner';
import { QRCodeDisplay } from './QRCodeDisplay';

interface SimpleQRCodeSyncUIProps {
  isDark: boolean;
  conversationStore: typeof ConversationStore;
}

export const SimpleQRCodeSyncUI: React.FC<SimpleQRCodeSyncUIProps> = ({ 
  isDark, 
  conversationStore 
}) => {
  // State
  const [syncMode, setSyncMode] = useState<'send' | 'receive' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncData, setSyncData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      setSyncMode(null);
      setError(null);
      setSyncData(null);
      setIsProcessing(false);
      setIsSuccess(false);
    };
  }, []);

  // Handle send button click
  const handleSend = async () => {
    setError(null);
    setIsProcessing(true);
    
    try {
      // Get all branches and prepare data
      const branches = await conversationStore.getAllBranches();
      
      // Get settings from localStorage
      const settings = {
        temperature: localStorage.getItem('temperature'),
        maxTokens: localStorage.getItem('maxTokens'),
        isDark: localStorage.getItem('isDark'),
        selectedModel: localStorage.getItem('selectedModel')
      };
      
      // Create sync data
      const data = {
        type: 'sync',
        branches,
        settings,
        timestamp: Date.now()
      };
      
      // Convert to JSON string
      const jsonData = JSON.stringify(data);
      
      // Set sync data for QR code display
      setSyncData(jsonData);
      
      // Set sync mode to send
      setSyncMode('send');
      setIsProcessing(false);
    } catch (error: any) {
      console.error('Error preparing sync data:', error);
      setError(error.message || 'Failed to prepare sync data');
      setIsProcessing(false);
    }
  };

  // Handle receive button click
  const handleReceive = () => {
    setError(null);
    setSyncMode('receive');
  };

  // Handle QR code scan
  const handleScan = async (data: string) => {
    setIsProcessing(true);
    
    try {
      // Parse the scanned data
      const parsedData = JSON.parse(data);
      
      // Check if the data is valid
      if (parsedData && parsedData.type === 'sync') {
        // Process the sync data
        await processSyncData(parsedData);
        
        // Show success message
        setIsSuccess(true);
        
        // Reset after 3 seconds
        setTimeout(() => {
          setSyncMode(null);
          setIsSuccess(false);
        }, 3000);
      } else {
        throw new Error('Invalid QR code data');
      }
    } catch (error: any) {
      console.error('Error processing QR code data:', error);
      setError(error.message || 'Failed to process QR code data');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process sync data
  const processSyncData = async (syncData: any): Promise<void> => {
    if (syncData && syncData.type === 'sync' && syncData.branches) {
      try {
        // Import branches
        if (syncData.branches && syncData.branches.length > 0) {
          for (const branch of syncData.branches) {
            // Check if branch already exists
            const existingBranch = await conversationStore.getBranch(branch.id);
            if (!existingBranch) {
              // Create new branch
              await conversationStore.createBranch(
                branch.name,
                branch.messages,
                branch.parentId
              );
            } else {
              // Update existing branch
              await conversationStore.updateBranch(
                branch.id,
                branch.messages
              );
            }
          }
        }

        // Import settings if available
        if (syncData.settings) {
          if (syncData.settings.temperature) localStorage.setItem('temperature', syncData.settings.temperature);
          if (syncData.settings.maxTokens) localStorage.setItem('maxTokens', syncData.settings.maxTokens);
          if (syncData.settings.isDark) localStorage.setItem('isDark', syncData.settings.isDark);
          if (syncData.settings.selectedModel) localStorage.setItem('selectedModel', syncData.settings.selectedModel);
        }

        console.log('Sync data processed successfully');
      } catch (error) {
        console.error('Error processing sync data:', error);
        throw error;
      }
    } else {
      throw new Error('Invalid sync data format');
    }
  };

  // Handle close
  const handleClose = () => {
    setSyncMode(null);
    setError(null);
    setSyncData(null);
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
      
      {/* Success Message */}
      {isSuccess && (
        <div className={`p-3 mb-4 rounded-lg text-sm ${
          isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
        }`}>
          Sync completed successfully!
        </div>
      )}
      
      {/* Sync Mode Selection */}
      {!syncMode && !isProcessing && !isSuccess && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleSend}
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
            onClick={handleReceive}
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
      
      {/* Processing Indicator */}
      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-12 h-12 border-4 border-t-4 border-gray-200 rounded-full animate-spin mb-4"
            style={{ borderTopColor: isDark ? '#2ecc71' : '#54ad95' }}
          ></div>
          <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
            Processing...
          </p>
        </div>
      )}
      
      {/* QR Code Display */}
      {syncMode === 'send' && syncData && (
        <QRCodeDisplay 
          data={syncData}
          onClose={handleClose}
          isDark={isDark}
          title="Scan this QR code to receive data"
        />
      )}
      
      {/* QR Code Scanner */}
      {syncMode === 'receive' && (
        <QRCodeScanner
          onScan={handleScan}
          onClose={handleClose}
          isDark={isDark}
        />
      )}
      
      {/* Instructions */}
      {!syncMode && !isProcessing && !isSuccess && (
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
import React, { useState, useEffect, useRef } from 'react';
import { PipingSyncManager } from '../sync/PipingSyncManager';
import { ConversationStore } from '../conversationStore';
import { X, RefreshCw, Send, Download, Copy, Check, Link } from 'lucide-react';

interface PipingSyncUIProps {
  isDark: boolean;
  pipingSyncManager: PipingSyncManager;
  isSyncing: boolean;
  isAvailable: boolean;
  error: string | null;
}

export const PipingSyncUI: React.FC<PipingSyncUIProps> = ({
  isDark,
  pipingSyncManager,
  isSyncing: externalIsSyncing,
  isAvailable: externalIsAvailable,
  error: externalError
}) => {
  // State
  const [syncMode, setSyncMode] = useState<'send' | 'receive' | null>(null);
  const [internalIsSyncing, setInternalIsSyncing] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [connectionPath, setConnectionPath] = useState<string>('');
  const [customPath, setCustomPath] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const effectiveIsSyncing = externalIsSyncing !== undefined ? externalIsSyncing : internalIsSyncing;
  const effectiveError = externalError || internalError;
  const [isPipingAvailable, setIsPipingAvailable] = useState<boolean>(externalIsAvailable !== undefined ? externalIsAvailable : true);
  
  // Refs
  const syncManagerRef = useRef<PipingSyncManager | null>(pipingSyncManager || null);
  
  // Check if piping functionality is available
  useEffect(() => {
    // Check if PipingSyncManager is available
    const hasPipingSync = pipingSyncManager && pipingSyncManager.isAvailable();
    
    console.log('PipingSyncUI: PipingSync availability check:', { hasPipingSync });
    setIsPipingAvailable(!!hasPipingSync);
  }, [pipingSyncManager]);
  
  // Use the provided piping sync manager
  useEffect(() => {
    if (!pipingSyncManager) return;
    
    // Set up event listeners
    pipingSyncManager.on('send-started', () => {
      setInternalIsSyncing(true);
      setInternalError(null);
    });
    
    pipingSyncManager.on('send-completed', () => {
      setInternalIsSyncing(false);
      setProgress(null);
    });
    
    pipingSyncManager.on('send-error', (error) => {
      setInternalIsSyncing(false);
      setInternalError(error.message);
    });
    
    pipingSyncManager.on('receive-started', () => {
      setInternalIsSyncing(true);
      setInternalError(null);
    });
    
    pipingSyncManager.on('receive-completed', (data) => {
      setInternalIsSyncing(false);
      setProgress(null);
      
      // Process received data
      pipingSyncManager.processSyncData(data)
        .then(() => {
          setInternalError(null);
          setSyncMode(null);
        })
        .catch((error) => {
          setInternalError(`Error processing sync data: ${error.message}`);
        });
    });
    
    pipingSyncManager.on('receive-error', (error) => {
      setInternalIsSyncing(false);
      setInternalError(error.message);
    });
    
    pipingSyncManager.on('progress-update', (bytesTransferred, totalBytes) => {
      setProgress({ current: bytesTransferred, total: totalBytes || 100 });
    });
    
    syncManagerRef.current = pipingSyncManager;
    
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
  }, [pipingSyncManager]);
  
  // Start sending data
  const handleStartSending = async () => {
    console.log("Start sending button clicked");
    if (!syncManagerRef.current) {
      setInternalError("Piping Sync Manager not initialized");
      return;
    }
    
    setInternalError(null);
    setSyncMode('send');
    
    try {
      console.log("Starting piping sending...");
      
      // Use custom path if provided, otherwise generate a random one
      const path = customPath.trim() || undefined;
      const resultPath = await syncManagerRef.current.startSending(path);
      setConnectionPath(resultPath);
      
      console.log("Piping sending started with path:", resultPath);
    } catch (error: any) {
      console.error("Failed to start sending via piping:", error);
      setInternalError(error.message || 'Failed to start sending data');
    }
  };
  
  // Start receiving data
  const handleStartReceiving = async () => {
    console.log("Start receiving button clicked");
    if (!syncManagerRef.current) {
      setInternalError("Piping Sync Manager not initialized");
      return;
    }
    
    if (!connectionPath.trim() && !customPath.trim()) {
      setInternalError("Please enter a connection code");
      return;
    }
    
    setInternalError(null);
    setSyncMode('receive');
    
    try {
      console.log("Starting piping receiving...");
      
      // Use the entered connection path
      const path = customPath.trim() || connectionPath.trim();
      await syncManagerRef.current.startReceiving(path);
      
      console.log("Piping receiving started with path:", path);
    } catch (error: any) {
      console.error("Failed to start receiving via piping:", error);
      setInternalError(error.message || 'Failed to start receiving data');
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
    setConnectionPath('');
    setCustomPath('');
  };
  
  // Copy connection code to clipboard
  const handleCopyCode = () => {
    if (connectionPath) {
      navigator.clipboard.writeText(connectionPath);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  
  // Generate connection link
  const getConnectionLink = () => {
    if (!connectionPath) return '';
    return `https://ppng.io/${connectionPath}`;
  };
  
  // Copy connection link to clipboard
  const handleCopyLink = () => {
    const link = getConnectionLink();
    if (link) {
      navigator.clipboard.writeText(link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  
  return (
    <div className={`p-4 rounded-xl transition-all duration-500 ${
      isDark ? 'bg-[#333333]/60 border-[#2ecc71]/30' : 'bg-[#f0f8ff]/60 border-[#54ad95]/30'
    } backdrop-blur-xl border`}>
      <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Piping Server Synchronization
      </h2>
      
      {/* Error Message */}
      {effectiveError && (
        <div className={`p-3 mb-4 rounded-lg text-sm ${
          isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
        }`}>
          {effectiveError}
        </div>
      )}
      
      {/* Availability Warning */}
      {!isPipingAvailable && !syncMode && (
        <div className={`p-3 mb-4 rounded-lg text-sm ${
          isDark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
        }`}>
          <p>Piping sync may not be fully supported in this browser.</p>
        </div>
      )}
      
      {/* Sync Mode Selection */}
      {!syncMode && (
        <div className="space-y-4">
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Connection Code (Optional)
            </label>
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="Enter a custom code (e.g., 'my-secret-code')"
              className={`w-full px-4 py-3 rounded-lg text-sm ${
                isDark
                  ? 'bg-[#444444]/80 border-[#555555] text-white placeholder-gray-500'
                  : 'bg-white/80 border-gray-300 text-gray-900 placeholder-gray-400'
              } border focus:outline-none focus:ring-2 ${
                isDark ? 'focus:ring-[#2ecc71]/50' : 'focus:ring-[#54ad95]/50'
              }`}
            />
            <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Leave empty to generate a random code
            </p>
          </div>
          
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
              <Download className="w-4 h-4" />
              Receive Data
            </button>
          </div>
        </div>
      )}
      
      {/* Send Mode */}
      {syncMode === 'send' && (
        <div className="mb-4">
          <p className={`text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Share this connection code with the receiving device:
          </p>
          
          {/* Connection Code Display */}
          {connectionPath && (
            <div className={`w-full p-4 mb-4 rounded-lg ${
              isDark ? 'bg-[#444444]/80 border-[#555555]' : 'bg-white/80 border-gray-300'
            } border flex items-center justify-between`}>
              <span className={`font-mono text-lg font-bold ${isDark ? 'text-[#2ecc71]' : 'text-[#54ad95]'}`}>
                {connectionPath}
              </span>
              <button
                onClick={handleCopyCode}
                className={`p-2 rounded-lg ${
                  isDark ? 'hover:bg-[#333333]' : 'hover:bg-gray-100'
                }`}
                title="Copy code"
              >
                {isCopied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          )}
          
          {/* Connection Link */}
          {connectionPath && (
            <div className={`w-full p-4 mb-4 rounded-lg ${
              isDark ? 'bg-[#444444]/80 border-[#555555]' : 'bg-white/80 border-gray-300'
            } border`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Or share this link:
                </span>
                <button
                  onClick={handleCopyLink}
                  className={`p-2 rounded-lg ${
                    isDark ? 'hover:bg-[#333333]' : 'hover:bg-gray-100'
                  }`}
                  title="Copy link"
                >
                  <Link className="w-4 h-4" />
                </button>
              </div>
              <div className="font-mono text-xs truncate">
                {getConnectionLink()}
              </div>
            </div>
          )}
          
          {/* Progress */}
          {progress && progress.total > 0 && (
            <div className="mb-4 text-center">
              <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Sending data: {Math.round((progress.current / progress.total) * 100)}%
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
            Connecting to: <span className="font-mono font-bold">{customPath || connectionPath}</span>
          </p>
          
          {/* Progress */}
          {progress && progress.total > 0 && (
            <div className="mb-4 text-center">
              <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Receiving data: {Math.round((progress.current / progress.total) * 100)}%
              </p>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                <div 
                  className={`h-2 rounded-full ${isDark ? 'bg-[#03a9f4]' : 'bg-[#0088fb]'}`}
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Loading Indicator */}
          {effectiveIsSyncing && !progress && (
            <div className="flex justify-center my-8">
              <RefreshCw className={`w-8 h-8 animate-spin ${
                isDark ? 'text-[#03a9f4]' : 'text-[#0088fb]'
              }`} />
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
      
      {/* Instructions */}
      {!syncMode && (
        <div className={`mt-4 p-3 rounded-lg text-xs ${
          isDark ? 'bg-[#333333]/80 text-gray-300' : 'bg-[#f0f8ff]/80 text-gray-700'
        }`}>
          <p className="mb-2 font-medium">How to sync:</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Enter the same connection code on both devices (or leave empty to generate one)</li>
            <li>On the sending device, click "Send Data"</li>
            <li>Share the generated code with the receiving device</li>
            <li>On the receiving device, enter the code and click "Receive Data"</li>
            <li>Wait for the data transfer to complete</li>
          </ol>
        </div>
      )}
    </div>
  );
};
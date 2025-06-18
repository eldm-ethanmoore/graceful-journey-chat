import React, { createContext, useState, useEffect, useContext } from 'react';
import { PipingSyncManager } from '../sync/PipingSyncManager';
import { ConversationStore } from '../conversationStore';

interface SyncContextType {
  pipingSyncManager: PipingSyncManager;
  isSending: boolean;
  isReceiving: boolean;
  isPipingSyncAvailable: boolean;
  syncError: string | null;
  syncWarningAcknowledged: boolean;
  showSyncWarning: boolean;
  currentSyncCode: string | null;
  
  // Methods
  startSending: () => void;
  stopSending: () => void;
  startReceiving: (path: string) => void;
  stopReceiving: () => void;
  acknowledgeSyncWarning: () => void;
  cancelSyncWarning: () => void;
}

export const SyncContext = createContext<SyncContextType | null>(null);

export const SyncProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // State extracted from App.tsx
  const [pipingSyncManager] = useState(() => new PipingSyncManager(ConversationStore));
  const [isSending, setIsSending] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [isPipingSyncAvailable, setIsPipingSyncAvailable] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncWarningAcknowledged, setSyncWarningAcknowledged] = useState(false);
  const [showSyncWarning, setShowSyncWarning] = useState(false);
  const [pendingSendAction, setPendingSendAction] = useState(false);
  const [pendingReceiveAction, setPendingReceiveAction] = useState<string | null>(null);
  const [currentSyncCode, setCurrentSyncCode] = useState<string | null>(null);
  
  // Event listeners from App.tsx
  useEffect(() => {
    // Check if Piping Sync is available
    setIsPipingSyncAvailable(pipingSyncManager.isAvailable());
    
    const handleSendStarted = () => setIsSending(true);
    const handleSendCompleted = () => {
      setIsSending(false);
      setSyncError(null);
      setCurrentSyncCode(null);
    };
    const handleReceiveStarted = () => setIsReceiving(true);
    const handleReceiveCompleted = (data: any) => {
      setIsReceiving(false);
      setSyncError(null);
      
      // Process received data if it exists
      if (data) {
        pipingSyncManager.processSyncData(data)
          .catch((error) => {
            console.error("Error processing sync data:", error);
            setSyncError(`Error processing sync data: ${error.message}`);
          });
      }
    };
    const handleSendError = (error: Error) => {
      setSyncError(error.message);
      setIsSending(false);
      setCurrentSyncCode(null);
    };
    const handleReceiveError = (error: Error) => {
      setSyncError(error.message);
      setIsReceiving(false);
    };

    pipingSyncManager.on('send-started', handleSendStarted);
    pipingSyncManager.on('send-completed', handleSendCompleted);
    pipingSyncManager.on('receive-started', handleReceiveStarted);
    pipingSyncManager.on('receive-completed', handleReceiveCompleted);
    pipingSyncManager.on('send-error', handleSendError);
    pipingSyncManager.on('receive-error', handleReceiveError);

    return () => {
      pipingSyncManager.off('send-started', handleSendStarted);
      pipingSyncManager.off('send-completed', handleSendCompleted);
      pipingSyncManager.off('receive-started', handleReceiveStarted);
      pipingSyncManager.off('receive-completed', handleReceiveCompleted);
      pipingSyncManager.off('send-error', handleSendError);
      pipingSyncManager.off('receive-error', handleReceiveError);
    };
  }, [pipingSyncManager]);

  // Reset acknowledgment when syncing stops
  useEffect(() => {
    if (!isSending && !isReceiving) {
      setSyncWarningAcknowledged(false);
    }
  }, [isSending, isReceiving]);

  // Update current sync code when sending
  useEffect(() => {
    if (isSending) {
      setCurrentSyncCode(pipingSyncManager.getCurrentSendPath());
    } else {
      setCurrentSyncCode(null);
    }
  }, [isSending, pipingSyncManager]);

  // Methods
  const startSending = () => {
    if (!isSending) {
      if (syncWarningAcknowledged) {
        pipingSyncManager.startSending()
          .then(code => setCurrentSyncCode(code))
          .catch(error => console.error("Error starting send:", error));
      } else {
        setPendingSendAction(true);
        setShowSyncWarning(true);
      }
    } else {
      pipingSyncManager.stopSending();
    }
  };

  const stopSending = () => {
    pipingSyncManager.stopSending();
    setCurrentSyncCode(null);
  };

  const startReceiving = (path: string) => {
    if (!isReceiving && path) {
      if (syncWarningAcknowledged) {
        pipingSyncManager.startReceiving(path)
          .catch(error => console.error("Error starting receive:", error));
      } else {
        setPendingReceiveAction(path);
        setShowSyncWarning(true);
      }
    } else if (isReceiving) {
      pipingSyncManager.stopReceiving();
    }
  };

  const stopReceiving = () => {
    pipingSyncManager.stopReceiving();
  };

  const acknowledgeSyncWarning = () => {
    setShowSyncWarning(false);
    setSyncWarningAcknowledged(true);
    
    // Execute the pending action
    if (pendingSendAction) {
      pipingSyncManager.startSending()
        .then(code => setCurrentSyncCode(code))
        .catch(error => console.error("Error starting send after acknowledgment:", error));
      setPendingSendAction(false);
    } else if (pendingReceiveAction) {
      pipingSyncManager.startReceiving(pendingReceiveAction)
        .catch(error => console.error("Error starting receive after acknowledgment:", error));
      setPendingReceiveAction(null);
    }
  };

  const cancelSyncWarning = () => {
    setShowSyncWarning(false);
    setPendingSendAction(false);
    setPendingReceiveAction(null);
  };

  return (
    <SyncContext.Provider value={{
      pipingSyncManager,
      isSending,
      isReceiving,
      isPipingSyncAvailable,
      syncError,
      syncWarningAcknowledged,
      showSyncWarning,
      currentSyncCode,
      startSending,
      stopSending,
      startReceiving,
      stopReceiving,
      acknowledgeSyncWarning,
      cancelSyncWarning
    }}>
      {children}
    </SyncContext.Provider>
  );
};

// Custom hook for using sync context
export const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
};
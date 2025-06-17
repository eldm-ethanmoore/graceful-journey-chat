import { EventEmitter } from 'events';
import { ConversationStore } from '../conversationStore';
import type { Branch, Message } from '../conversationStore';
// Import the entire library to ensure QRCode is defined
import * as QRCodeSync from '@lo-fi/qr-data-sync';
const { send, receive } = QRCodeSync;

/**
 * Interface for QR code sync events
 */
export interface QRCodeSyncEvents {
  'send-started': () => void;
  'send-completed': () => void;
  'send-error': (error: Error) => void;
  'receive-started': () => void;
  'receive-completed': (data: any) => void;
  'receive-error': (error: Error) => void;
  'frame-sent': (frameIndex: number, frameCount: number) => void;
  'frame-received': (framesRead: number, frameCount: number) => void;
}

/**
 * QR Code Sync Manager for synchronizing data between devices
 */
export class QRCodeSyncManager extends EventEmitter {
  private conversationStore: typeof ConversationStore;
  private sendCancelToken: AbortController | null = null;
  private receiveCancelToken: AbortController | null = null;
  private isSending = false;
  private isReceiving = false;

  /**
   * Create a new QRCodeSyncManager
   * @param conversationStore Conversation store
   */
  constructor(conversationStore: typeof ConversationStore) {
    super();
    this.conversationStore = conversationStore;
  }

  /**
   * Check if QR code sync is available in this browser
   * @returns True if QR code sync is available
   */
  isAvailable(): boolean {
    // Check if the browser supports the MediaDevices API for camera access
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Start sending data via QR codes
   * @param qrCodeElement DOM element to render QR codes in
   * @returns Promise that resolves when sending starts
   */
  async startSending(qrCodeElement: HTMLElement | string): Promise<boolean> {
    console.log("QRCodeSyncManager: startSending called", { qrCodeElement });
    
    if (this.isSending) {
      console.log("QRCodeSyncManager: Already sending, stopping previous session");
      this.stopSending();
    }

    this.isSending = true;
    this.sendCancelToken = new AbortController();

    try {
      // Get all branches and prepare data
      console.log("QRCodeSyncManager: Getting branches from store");
      const branches = await this.conversationStore.getAllBranches();
      console.log(`QRCodeSyncManager: Got ${branches.length} branches`);
      
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

      console.log("QRCodeSyncManager: Emitting send-started event");
      this.emit('send-started');

      // Ensure we have a valid element
      let element: HTMLElement;
      if (typeof qrCodeElement === 'string') {
        const foundElement = document.getElementById(qrCodeElement);
        if (!foundElement) {
          throw new Error(`Element with ID ${qrCodeElement} not found`);
        }
        element = foundElement;
      } else {
        element = qrCodeElement;
      }
      
      console.log("QRCodeSyncManager: Starting QR code sending with element", element);

      // Start sending data via QR codes
      const sendStarted = await QRCodeSync.send(
        syncData,
        element,
        {
          signal: this.sendCancelToken.signal,
          onFrameRendered: (frameIndex, frameCount) => {
            console.log(`QRCodeSyncManager: Frame ${frameIndex + 1}/${frameCount} rendered`);
            this.emit('frame-sent', frameIndex, frameCount);
          },
          maxFramesPerSecond: 5, // Reduced for better reliability
          frameTextChunkSize: 40, // Reduced for better reliability
          qrCodeSize: 300 // Explicit size for better visibility
        }
      );

      console.log("QRCodeSyncManager: Send started result:", sendStarted);
      
      if (sendStarted) {
        return true;
      } else {
        throw new Error('Failed to start sending QR codes');
      }
    } catch (error: any) {
      console.error("QRCodeSyncManager: Error in startSending:", error);
      this.isSending = false;
      this.emit('send-error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Stop sending data via QR codes
   */
  stopSending(): void {
    console.log("QRCodeSyncManager: stopSending called");
    if (this.sendCancelToken) {
      this.sendCancelToken.abort('Sending canceled');
      this.sendCancelToken = null;
    }
    this.isSending = false;
    this.emit('send-completed');
    
    // Clean up the QR code container
    const qrContainer = document.getElementById('qr-code-container-fixed');
    if (qrContainer) {
      // Clear the container
      qrContainer.innerHTML = '';
      // Hide the container
      qrContainer.style.display = 'none';
    }
  }

  /**
   * Start receiving data via QR codes
   * @param videoElement Video element for camera feed
   * @returns Promise that resolves with received data
   */
  async startReceiving(videoElement: HTMLVideoElement | string): Promise<any> {
    console.log("QRCodeSyncManager: startReceiving called", { videoElement });
    
    if (this.isReceiving) {
      console.log("QRCodeSyncManager: Already receiving, stopping previous session");
      this.stopReceiving();
    }

    this.isReceiving = true;
    this.receiveCancelToken = new AbortController();

    try {
      console.log("QRCodeSyncManager: Emitting receive-started event");
      this.emit('receive-started');

      // Ensure we have a valid element
      let element: HTMLVideoElement;
      if (typeof videoElement === 'string') {
        const foundElement = document.getElementById(videoElement) as HTMLVideoElement;
        if (!foundElement) {
          throw new Error(`Video element with ID ${videoElement} not found`);
        }
        element = foundElement;
      } else {
        element = videoElement;
      }
      
      console.log("QRCodeSyncManager: Starting QR code receiving with video element", element);

      // Start receiving data via QR codes
      const receiveResult = await QRCodeSync.receive(
        element,
        {
          signal: this.receiveCancelToken.signal,
          onFrameReceived: (framesRead, frameCount, frameIndex) => {
            console.log(`QRCodeSyncManager: Frame ${framesRead}/${frameCount} received`);
            this.emit('frame-received', framesRead, frameCount);
          },
          maxScansPerSecond: 8, // Reduced for better reliability
          preferredCamera: 'environment', // Use back camera by default
          highlightScanRegion: true // Show scan region
        }
      );

      console.log("QRCodeSyncManager: Receive completed with result:", receiveResult);
      this.isReceiving = false;

      if (receiveResult && receiveResult.data) {
        console.log("QRCodeSyncManager: Emitting receive-completed event with data");
        this.emit('receive-completed', receiveResult.data);
        return receiveResult.data;
      } else {
        throw new Error('No data received from QR codes');
      }
    } catch (error: any) {
      console.error("QRCodeSyncManager: Error in startReceiving:", error);
      this.isReceiving = false;
      this.emit('receive-error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Stop receiving data via QR codes
   */
  stopReceiving(): void {
    console.log("QRCodeSyncManager: stopReceiving called");
    if (this.receiveCancelToken) {
      this.receiveCancelToken.abort('Receiving canceled');
      this.receiveCancelToken = null;
    }
    this.isReceiving = false;
    
    // Clean up the video element
    const videoElement = document.getElementById('qr-video-element-fixed') as HTMLVideoElement;
    if (videoElement) {
      // Stop any active streams
      if (videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => {
            console.log("QRCodeSyncManager: Stopping video track");
            track.stop();
          });
        }
      }
      videoElement.srcObject = null;
      // Hide the video element
      videoElement.style.display = 'none';
    }
  }

  /**
   * Process received sync data
   * @param syncData Sync data received from QR codes
   */
  async processSyncData(syncData: any): Promise<void> {
    if (syncData && syncData.type === 'sync' && syncData.branches) {
      try {
        // Import branches
        if (syncData.branches && syncData.branches.length > 0) {
          for (const branch of syncData.branches) {
            // Check if branch already exists
            const existingBranch = await this.conversationStore.getBranch(branch.id);
            if (!existingBranch) {
              // Create new branch
              await this.conversationStore.createBranch(
                branch.name,
                branch.messages,
                branch.parentId
              );
            } else {
              // Update existing branch
              await this.conversationStore.updateBranch(
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
  }

  /**
   * Register an event listener
   * @param event Event name
   * @param listener Event listener
   */
  on<K extends keyof QRCodeSyncEvents>(event: K, listener: QRCodeSyncEvents[K]): this {
    return super.on(event, listener);
  }

  /**
   * Remove an event listener
   * @param event Event name
   * @param listener Event listener
   */
  off<K extends keyof QRCodeSyncEvents>(event: K, listener: QRCodeSyncEvents[K]): this {
    return super.off(event, listener);
  }

  /**
   * Check if sending is in progress
   */
  isSendingInProgress(): boolean {
    return this.isSending;
  }

  /**
   * Check if receiving is in progress
   */
  isReceivingInProgress(): boolean {
    return this.isReceiving;
  }
}
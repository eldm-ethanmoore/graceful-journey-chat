/**
 * Simple QR Code Sync
 * 
 * A simplified implementation of QR code sync functionality that doesn't rely on
 * the @lo-fi/qr-data-sync library. This is a fallback solution when the library
 * doesn't work properly.
 */

import { ConversationStore } from '../conversationStore';
import { EventEmitter } from 'events';

// Import QRCode from qrcode library
import * as QRCode from 'qrcode';

export interface SimpleQRCodeSyncEvents {
  'send-started': () => void;
  'send-completed': () => void;
  'send-error': (error: Error) => void;
  'receive-started': () => void;
  'receive-completed': (data: any) => void;
  'receive-error': (error: Error) => void;
  'frame-sent': (frameIndex: number, frameCount: number) => void;
  'frame-received': (framesRead: number, frameCount: number) => void;
}

export class SimpleQRCodeSync extends EventEmitter {
  private conversationStore: typeof ConversationStore;
  private isSending = false;
  private isReceiving = false;
  private sendCancelToken: AbortController | null = null;
  private receiveCancelToken: AbortController | null = null;

  constructor(conversationStore: typeof ConversationStore) {
    super();
    this.conversationStore = conversationStore;
  }

  /**
   * Check if QR code sync is available
   */
  isAvailable(): boolean {
    // Check if the browser supports the MediaDevices API for camera access
    const hasCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    
    // Check if QRCode library is available
    const hasQRCode = typeof QRCode !== 'undefined';
    
    console.log('SimpleQRCodeSync.isAvailable:', { hasCamera, hasQRCode });
    
    return hasCamera && hasQRCode;
  }

  /**
   * Start sending data via QR codes
   * @param element DOM element to render QR codes in
   */
  async startSending(element: HTMLElement | string): Promise<boolean> {
    console.log("SimpleQRCodeSync: startSending called", { element });
    
    if (this.isSending) {
      console.log("SimpleQRCodeSync: Already sending, stopping previous session");
      this.stopSending();
    }

    this.isSending = true;
    this.sendCancelToken = new AbortController();

    try {
      // Get all branches and prepare data
      console.log("SimpleQRCodeSync: Getting branches from store");
      const branches = await this.conversationStore.getAllBranches();
      console.log(`SimpleQRCodeSync: Got ${branches.length} branches`);
      
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

      console.log("SimpleQRCodeSync: Emitting send-started event");
      this.emit('send-started');

      // Ensure we have a valid element
      let targetElement: HTMLElement;
      if (typeof element === 'string') {
        const foundElement = document.getElementById(element);
        if (!foundElement) {
          throw new Error(`Element with ID ${element} not found`);
        }
        targetElement = foundElement;
      } else {
        targetElement = element;
      }
      
      // Clear the element
      targetElement.innerHTML = '';
      
      // Create a simple QR code with the data
      const jsonData = JSON.stringify(syncData);
      
      try {
        // Check if we can use the Lo-Fi library directly
        if (typeof window.QRCodeSync !== 'undefined' &&
            typeof window.QRCodeSync.send === 'function') {
          
          console.log("SimpleQRCodeSync: Using Lo-Fi library for QR code generation");
          
          // Use the Lo-Fi library to generate animated QR codes
          await window.QRCodeSync.send(
            syncData,
            targetElement,
            {
              onFrameRendered: (frameIndex, frameCount) => {
                console.log(`SimpleQRCodeSync: Frame ${frameIndex + 1}/${frameCount} rendered`);
                this.emit('frame-sent', frameIndex, frameCount);
              },
              maxFramesPerSecond: 5,
              frameTextChunkSize: 40,
              qrCodeSize: 300
            }
          );
          
          console.log("SimpleQRCodeSync: QR code generation started with Lo-Fi library");
          return true;
        } else {
          // Fall back to simple QR code generation
          console.log("SimpleQRCodeSync: Falling back to simple QR code generation");
          
          // Check if the data is too large
          if (jsonData.length > 1000) {
            throw new Error("The amount of data is too big to be stored in a QR Code");
          }
          
          // Generate QR code
          await QRCode.toCanvas(targetElement, jsonData, {
            width: 300,
            margin: 1,
            errorCorrectionLevel: 'H'
          });
          
          // Emit frame sent event
          this.emit('frame-sent', 0, 1);
          
          console.log("SimpleQRCodeSync: QR code generated successfully");
          return true;
        }
      } catch (error) {
        console.error("SimpleQRCodeSync: Error generating QR code:", error);
        throw error;
      }
    } catch (error: any) {
      console.error("SimpleQRCodeSync: Error in startSending:", error);
      this.isSending = false;
      this.emit('send-error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Stop sending data via QR codes
   */
  stopSending(): void {
    console.log("SimpleQRCodeSync: stopSending called");
    if (this.sendCancelToken) {
      this.sendCancelToken.abort('Sending canceled');
      this.sendCancelToken = null;
    }
    this.isSending = false;
    this.emit('send-completed');
  }

  /**
   * Start receiving data via QR codes
   * @param videoElement Video element for camera feed
   */
  async startReceiving(videoElement: HTMLVideoElement | string): Promise<any> {
    console.log("SimpleQRCodeSync: startReceiving called", { videoElement });
    
    if (this.isReceiving) {
      console.log("SimpleQRCodeSync: Already receiving, stopping previous session");
      this.stopReceiving();
    }

    this.isReceiving = true;
    this.receiveCancelToken = new AbortController();

    try {
      console.log("SimpleQRCodeSync: Emitting receive-started event");
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
      
      // For now, just emit a receive-error since we don't have a full implementation
      this.emit('receive-error', new Error('QR code receiving not fully implemented in SimpleQRCodeSync'));
      return null;
    } catch (error: any) {
      console.error("SimpleQRCodeSync: Error in startReceiving:", error);
      this.isReceiving = false;
      this.emit('receive-error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Stop receiving data via QR codes
   */
  stopReceiving(): void {
    console.log("SimpleQRCodeSync: stopReceiving called");
    if (this.receiveCancelToken) {
      this.receiveCancelToken.abort('Receiving canceled');
      this.receiveCancelToken = null;
    }
    this.isReceiving = false;
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
  on<K extends keyof SimpleQRCodeSyncEvents>(event: K, listener: SimpleQRCodeSyncEvents[K]): this {
    return super.on(event, listener);
  }

  /**
   * Remove an event listener
   * @param event Event name
   * @param listener Event listener
   */
  off<K extends keyof SimpleQRCodeSyncEvents>(event: K, listener: SimpleQRCodeSyncEvents[K]): this {
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
import { EventEmitter } from 'events';
import { ConversationStore } from '../conversationStore';
import type { Branch, Message } from '../conversationStore';

/**
 * Interface for Piping sync events
 */
export interface PipingSyncEvents {
  'send-started': () => void;
  'send-completed': () => void;
  'send-error': (error: Error) => void;
  'receive-started': () => void;
  'receive-completed': (data: any) => void;
  'receive-error': (error: Error) => void;
  'progress-update': (bytesTransferred: number, totalBytes: number) => void;
}

/**
 * Piping Sync Manager for synchronizing data between devices using piping server
 */
export class PipingSyncManager extends EventEmitter {
  private conversationStore: typeof ConversationStore;
  private sendAbortController: AbortController | null = null;
  private receiveAbortController: AbortController | null = null;
  private isSending = false;
  private isReceiving = false;
  private pipingServerUrl: string;
  private currentSendPath: string | null = null;

  /**
   * Create a new PipingSyncManager
   * @param conversationStore Conversation store
   * @param pipingServerUrl URL of the piping server (defaults to ppng.io)
   */
  constructor(conversationStore: typeof ConversationStore, pipingServerUrl: string = 'https://ppng.io') {
    super();
    this.conversationStore = conversationStore;
    this.pipingServerUrl = pipingServerUrl;
  }

  /**
   * Check if piping sync is available in this browser
   * @returns True if piping sync is available
   */
  isAvailable(): boolean {
    // Modern browsers all support fetch and AbortController
    // This method is kept for API compatibility with QRCodeSyncManager
    return true;
  }

  /**
   * Generate a random path for piping server
   * @returns Random path string
   */
  private generateRandomPath(): string {
    // Generate a random 10-character string
    return Math.random().toString(36).substring(2, 12);
  }

  /**
   * Start sending data via piping server
   * @param path Optional custom path to use (if not provided, a random one will be generated)
   * @returns Promise that resolves with the path when sending starts
   */
  async startSending(path?: string): Promise<string> {
    console.log("PipingSyncManager: startSending called");
    
    if (this.isSending) {
      console.log("PipingSyncManager: Already sending, stopping previous session");
      this.stopSending();
      
      // Add a small delay to ensure the previous operation is fully stopped
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Make sure we create a fresh abort controller
    this.sendAbortController = new AbortController();
    this.isSending = true;

    try {
      // Get all branches and prepare data
      console.log("PipingSyncManager: Getting branches from store");
      const branches = await this.conversationStore.getAllBranches();
      console.log(`PipingSyncManager: Got ${branches.length} branches`);
      
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

      console.log("PipingSyncManager: Emitting send-started event");
      this.emit('send-started');

      // Generate or use provided path
      const pipingPath = path || this.generateRandomPath();
      this.currentSendPath = pipingPath; // Store the current path
      const pipingUrl = `${this.pipingServerUrl}/${pipingPath}`;
      
      console.log(`PipingSyncManager: Using piping path: ${pipingPath}`);

      // Convert data to JSON string
      const jsonData = JSON.stringify(syncData);
      const encoder = new TextEncoder();
      const data = encoder.encode(jsonData);
      
      // Send data to piping server
      const response = await fetch(pipingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonData,
        signal: this.sendAbortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to send data: ${response.status} ${response.statusText}`);
      }

      console.log("PipingSyncManager: Data sent successfully, keeping connection open");
      // Don't set isSending to false or emit send-completed here
      // The connection needs to stay open until stopSending is called
      
      return pipingPath;
    } catch (error: any) {
      console.error("PipingSyncManager: Error in startSending:", error);
      this.isSending = false;
      
      // Don't emit error if it was aborted intentionally
      if (error.name !== 'AbortError') {
        this.emit('send-error', error instanceof Error ? error : new Error(String(error)));
      }
      
      throw error;
    }
  }

  /**
   * Stop sending data
   */
  stopSending(): void {
    console.log("PipingSyncManager: stopSending called");
    
    // First set the flag to false to prevent race conditions
    this.isSending = false;
    
    // Clear the current send path
    this.currentSendPath = null;
    
    // Then abort the controller if it exists
    if (this.sendAbortController) {
      try {
        this.sendAbortController.abort();
      } catch (error) {
        console.warn("PipingSyncManager: Error aborting send controller:", error);
      } finally {
        this.sendAbortController = null;
      }
    }
    
    // Emit send-completed event to ensure UI is updated
    this.emit('send-completed');
  }
  
  /**
   * Get the current send path
   * @returns The current send path or null if not sending
   */
  getCurrentSendPath(): string | null {
    return this.currentSendPath;
  }

  /**
   * Start receiving data via piping server
   * @param path Path to receive data from
   * @returns Promise that resolves with received data
   */
  async startReceiving(path: string): Promise<any> {
    console.log("PipingSyncManager: startReceiving called", { path });
    
    if (this.isReceiving) {
      console.log("PipingSyncManager: Already receiving, stopping previous session");
      this.stopReceiving();
      
      // Add a small delay to ensure the previous operation is fully stopped
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Make sure we create a fresh abort controller
    this.receiveAbortController = new AbortController();
    this.isReceiving = true;

    try {
      console.log("PipingSyncManager: Emitting receive-started event");
      this.emit('receive-started');

      // Construct the URL
      const pipingUrl = `${this.pipingServerUrl}/${path}`;
      console.log(`PipingSyncManager: Receiving from ${pipingUrl}`);

      // Fetch data from piping server
      const response = await fetch(pipingUrl, {
        method: 'GET',
        signal: this.receiveAbortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to receive data: ${response.status} ${response.statusText}`);
      }

      // Get total size for progress tracking
      const contentLength = response.headers.get('Content-Length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      
      // Set up a reader to stream the response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let receivedData = '';
      let bytesReceived = 0;

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Convert the chunk to text and append to receivedData
        const chunk = new TextDecoder().decode(value);
        receivedData += chunk;
        
        // Update progress
        bytesReceived += value.length;
        this.emit('progress-update', bytesReceived, totalBytes);
      }

      // Parse the received data
      let parsedData;
      try {
        parsedData = JSON.parse(receivedData);
      } catch (parseError) {
        throw new Error(`Failed to parse received data: ${parseError}`);
      }

      console.log("PipingSyncManager: Receive completed with data:", parsedData);
      this.isReceiving = false;

      if (parsedData) {
        console.log("PipingSyncManager: Emitting receive-completed event with data");
        this.emit('receive-completed', parsedData);
        return parsedData;
      } else {
        throw new Error('No data received from piping server');
      }
    } catch (error: any) {
      console.error("PipingSyncManager: Error in startReceiving:", error);
      this.isReceiving = false;
      
      // Don't emit error if it was aborted intentionally
      if (error.name !== 'AbortError') {
        this.emit('receive-error', error instanceof Error ? error : new Error(String(error)));
      }
      
      throw error;
    }
  }

  /**
   * Stop receiving data
   */
  stopReceiving(): void {
    console.log("PipingSyncManager: stopReceiving called");
    
    // First set the flag to false to prevent race conditions
    this.isReceiving = false;
    
    // Then abort the controller if it exists
    if (this.receiveAbortController) {
      try {
        this.receiveAbortController.abort();
      } catch (error) {
        console.warn("PipingSyncManager: Error aborting receive controller:", error);
      } finally {
        this.receiveAbortController = null;
      }
    }
    
    // Emit receive-completed event to ensure UI is updated
    this.emit('receive-completed', null);
  }

  /**
   * Process received sync data
   * @param syncData Sync data received from piping server
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
  on<K extends keyof PipingSyncEvents>(event: K, listener: PipingSyncEvents[K]): this {
    return super.on(event, listener);
  }

  /**
   * Remove an event listener
   * @param event Event name
   * @param listener Event listener
   */
  off<K extends keyof PipingSyncEvents>(event: K, listener: PipingSyncEvents[K]): this {
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
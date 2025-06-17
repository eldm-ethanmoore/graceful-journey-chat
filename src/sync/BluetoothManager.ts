import { EventEmitter } from 'events';
import { ConversationStore } from '../conversationStore';
import type { Branch, Message } from '../conversationStore';

export interface BluetoothDevice {
  id: string;
  name: string;
  connected: boolean;
}

export class BluetoothManager extends EventEmitter {
  private device: any = null;
  private server: any = null;
  private service: any = null;
  private characteristic: any = null;
  private isConnected = false;
  private conversationStore: typeof ConversationStore;

  constructor(conversationStore: typeof ConversationStore) {
    super();
    this.conversationStore = conversationStore;
  }

  isBluetoothAvailable(): boolean {
    return 'bluetooth' in navigator;
  }

  async requestDevice(): Promise<BluetoothDevice | null> {
    try {
      if (!this.isBluetoothAvailable()) {
        const error = new Error('Bluetooth not supported in this browser');
        this.emit('error', error);
        return null;
      }

      try {
        const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['00001234-0000-1000-8000-00805f9b34fb'] // Custom service UUID
        });

        this.device = device;
        this.emit('deviceFound', { id: device.id, name: device.name || 'Unknown Device' });
        
        return {
          id: device.id,
          name: device.name || 'Unknown Device',
          connected: false
        };
      } catch (error: any) {
        // Handle permission denied or API disabled errors
        if (error.name === 'NotFoundError' && error.message.includes('globally disabled')) {
          const customError = new Error('Web Bluetooth API is disabled in your browser. Please enable it in your browser settings.');
          console.error(customError.message);
          this.emit('error', customError);
        } else if (error.name === 'NotAllowedError') {
          const customError = new Error('Bluetooth permission denied. Please allow Bluetooth access.');
          console.error(customError.message);
          this.emit('error', customError);
        } else {
          console.error('Error requesting device:', error);
          this.emit('error', error);
        }
        return null;
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      this.emit('error', error);
      return null;
    }
  }

  async connect(): Promise<boolean> {
    try {
      if (!this.isBluetoothAvailable()) {
        const error = new Error('Bluetooth not supported in this browser');
        this.emit('error', error);
        return false;
      }
      
      if (!this.device) {
        throw new Error('No device selected');
      }

      try {
        this.server = await this.device.gatt.connect();
        this.service = await this.server.getPrimaryService('00001234-0000-1000-8000-00805f9b34fb');
        this.characteristic = await this.service.getCharacteristic('00001235-0000-1000-8000-00805f9b34fb');

        // Start notifications
        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', this.handleDataReceived.bind(this));

        this.isConnected = true;
        this.emit('connected');
        return true;
      } catch (error: any) {
        if (error.name === 'NotFoundError' && error.message.includes('globally disabled')) {
          const customError = new Error('Web Bluetooth API is disabled in your browser. Please enable it in your browser settings.');
          console.error(customError.message);
          this.emit('error', customError);
        } else {
          console.error('Error connecting:', error);
          this.emit('error', error);
        }
        return false;
      }
    } catch (error) {
      console.error('Unexpected error during connection:', error);
      this.emit('error', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.server && this.server.connected) {
      await this.server.disconnect();
    }
    this.isConnected = false;
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristic = null;
    this.emit('disconnected');
  }

  async syncData(): Promise<void> {
    if (!this.isBluetoothAvailable()) {
      const error = new Error('Bluetooth not supported in this browser');
      this.emit('error', error);
      throw error;
    }
    
    if (!this.isConnected || !this.characteristic) {
      const error = new Error('Not connected to any Bluetooth device');
      this.emit('error', error);
      throw error;
    }

    try {
      this.emit('syncStarted');
      
      // Get all branches and prepare data
      const branches = await this.conversationStore.getAllBranches();
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

      // Send data in chunks (BLE has size limits)
      const dataString = JSON.stringify(syncData);
      const chunks = this.chunkData(dataString, 512); // 512 bytes per chunk

      for (const chunk of chunks) {
        const encoder = new TextEncoder();
        await this.characteristic.writeValue(encoder.encode(chunk));
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between chunks
      }

      this.emit('syncCompleted');
    } catch (error) {
      console.error('Sync error:', error);
      this.emit('syncError', error);
      throw error;
    }
  }

  private handleDataReceived(event: any): void {
    const value = event.target.value;
    const decoder = new TextDecoder();
    const data = decoder.decode(value);
    
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'sync') {
        this.emit('dataReceived', parsed);
      }
    } catch (error) {
      console.error('Error parsing received data:', error);
    }
  }

  private chunkData(data: string, chunkSize: number): string[] {
    const chunks = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
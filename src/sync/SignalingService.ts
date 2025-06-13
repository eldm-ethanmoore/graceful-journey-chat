import { EventEmitter } from 'events';

/**
 * Interface for signaling service events
 */
export interface SignalingEvents {
  'connect': () => void;
  'disconnect': () => void;
  'error': (error: Error) => void;
  'room-joined': (data: { peers: string[], roomId: string }) => void;
  'peer-joined': (data: { peerId: string, roomId: string }) => void;
  'signal': (data: { peerId: string, signal: any, roomId: string }) => void;
  'broadcast': (data: { peerId: string, data: any, roomId: string }) => void;
}

/**
 * Service to handle WebSocket communication with the signaling server
 */
export class SignalingService {
  private socket: WebSocket | null = null;
  private events = new EventEmitter();
  private connectionUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  
  /**
   * Create a new SignalingService
   * @param url WebSocket URL of the signaling server
   */
  constructor(url: string) {
    // Use the provided URL if given, otherwise use the deployed WebSocket API
    this.connectionUrl = url || "wss://bffixwsqwf.execute-api.us-east-1.amazonaws.com/production/";
  }
  
  /**
   * Connect to the signaling server
   */
  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.connectionUrl);
        
        this.socket.onopen = () => {
          console.log('Connected to signaling server');
          this.reconnectAttempts = 0;
          this.events.emit('connect');
          resolve();
        };
        
        this.socket.onclose = (event) => {
          console.log(`Disconnected from signaling server: ${event.code} ${event.reason}`);
          this.events.emit('disconnect');
          this.attemptReconnect();
        };
        
        this.socket.onerror = (error) => {
          console.error('Signaling server error:', error);
          this.events.emit('error', new Error('WebSocket error'));
          reject(new Error('Failed to connect to signaling server'));
        };
        
        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };
      } catch (error) {
        console.error('Error connecting to signaling server:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect from the signaling server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  /**
   * Join a room on the signaling server
   * @param roomId ID of the room to join
   */
  public joinRoom(roomId: string): void {
    this.sendMessage({
      type: 'join-room',
      roomId
    });
  }
  
  /**
   * Send a signaling message to a peer
   * @param targetId ID of the target peer
   * @param signal Signaling data
   * @param roomId ID of the room
   */
  public sendSignal(targetId: string, signal: any, roomId: string): void {
    this.sendMessage({
      type: 'signal',
      targetId,
      signal,
      roomId
    });
  }
  
  /**
   * Broadcast a message to all peers in a room
   * @param roomId ID of the room
   * @param data Data to broadcast
   */
  public broadcast(roomId: string, data: any): void {
    this.sendMessage({
      type: 'broadcast',
      roomId,
      data
    });
  }
  
  /**
   * Register an event listener
   * @param event Event name
   * @param listener Event listener
   */
  public on<K extends keyof SignalingEvents>(event: K, listener: SignalingEvents[K]): void {
    this.events.on(event, listener);
  }
  
  /**
   * Remove an event listener
   * @param event Event name
   * @param listener Event listener
   */
  public off<K extends keyof SignalingEvents>(event: K, listener: SignalingEvents[K]): void {
    this.events.off(event, listener);
  }
  
  /**
   * Send a message to the signaling server
   * @param message Message to send
   */
  private sendMessage(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message: WebSocket is not connected');
    }
  }
  
  /**
   * Handle an incoming message from the signaling server
   * @param message Received message
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'room-joined':
        this.events.emit('room-joined', {
          peers: message.peers,
          roomId: message.roomId
        });
        break;
        
      case 'peer-joined':
        this.events.emit('peer-joined', {
          peerId: message.peerId,
          roomId: message.roomId
        });
        break;
        
      case 'signal':
        this.events.emit('signal', {
          peerId: message.peerId,
          signal: message.signal,
          roomId: message.roomId
        });
        break;
        
      case 'broadcast':
        this.events.emit('broadcast', {
          peerId: message.peerId,
          data: message.data,
          roomId: message.roomId
        });
        break;
        
      default:
        console.warn('Unknown message type:', message.type);
    }
  }
  
  /**
   * Attempt to reconnect to the signaling server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }
    
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    console.log(`Attempting to reconnect in ${delay}ms...`);
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.error('Reconnect failed:', error);
      });
    }, delay);
  }
}
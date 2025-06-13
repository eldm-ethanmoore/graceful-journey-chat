import { SignalingService } from './SignalingService';
import { ConversationStore } from '../conversationStore';
import type { Branch, Snapshot } from '../conversationStore';
import { EventEmitter } from 'events';

// For now, we'll use a type declaration to avoid the import error
// You'll need to install: npm install simple-peer @types/simple-peer
declare namespace Peer {
  interface Instance {
    on(event: string, callback: any): void;
    signal(data: any): void;
    send(data: Uint8Array): void;
    destroy(): void;
  }
}

declare const Peer: {
  new(options: any): Peer.Instance;
};

/**
 * Interface for WebRTC manager events
 */
export interface WebRTCEvents {
  'peer-connected': (peerId: string) => void;
  'peer-disconnected': (peerId: string) => void;
  'sync-started': () => void;
  'sync-completed': () => void;
  'sync-error': (error: Error) => void;
  'connection-state-changed': (state: ConnectionState) => void;
}

/**
 * Connection state type
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

// Constants for connection states
export const ConnectionState = {
  DISCONNECTED: 'disconnected' as ConnectionState,
  CONNECTING: 'connecting' as ConnectionState,
  CONNECTED: 'connected' as ConnectionState,
  ERROR: 'error' as ConnectionState
};

/**
 * WebRTC connection manager for peer-to-peer data synchronization
 */
export class WebRTCManager {
  private peers: Map<string, Peer.Instance> = new Map();
  private signaling: SignalingService;
  private dataStore: ConversationStore;
  private roomId: string | null = null;
  private events = new EventEmitter();
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private syncInProgress = false;
  
  /**
   * Create a new WebRTCManager
   * @param signaling Signaling service
   * @param dataStore Conversation store
   */
  constructor(signaling: SignalingService, dataStore: ConversationStore) {
    this.signaling = signaling;
    this.dataStore = dataStore;
    this.setupSignalingListeners();
  }
  
  /**
   * Create a new room and generate connection info
   * @returns Room ID for the new room
   */
  public async createRoom(): Promise<string> {
    // Generate a random room ID
    this.roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Update connection state
    this.setConnectionState(ConnectionState.CONNECTING);
    
    try {
      // Connect to signaling server and join room
      await this.signaling.connect();
      this.signaling.joinRoom(this.roomId);
      
      return this.roomId;
    } catch (error) {
      this.setConnectionState(ConnectionState.ERROR);
      throw error;
    }
  }
  
  /**
   * Join an existing room using a room ID
   * @param roomId Room ID to join
   */
  public async joinRoom(roomId: string): Promise<void> {
    this.roomId = roomId;
    
    // Update connection state
    this.setConnectionState(ConnectionState.CONNECTING);
    
    try {
      // Connect to signaling server and join room
      await this.signaling.connect();
      this.signaling.joinRoom(this.roomId);
    } catch (error) {
      this.setConnectionState(ConnectionState.ERROR);
      throw error;
    }
  }
  
  /**
   * Disconnect from all peers and the signaling server
   */
  public disconnect(): void {
    // Close all peer connections
    for (const [peerId, peer] of this.peers.entries()) {
      peer.destroy();
      this.peers.delete(peerId);
      this.events.emit('peer-disconnected', peerId);
    }
    
    // Disconnect from signaling server
    this.signaling.disconnect();
    
    // Reset state
    this.roomId = null;
    this.setConnectionState(ConnectionState.DISCONNECTED);
  }
  
  /**
   * Get the current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }
  
  /**
   * Get the number of connected peers
   */
  public getConnectedPeersCount(): number {
    return this.peers.size;
  }
  
  /**
   * Manually trigger a sync with all connected peers
   */
  public async triggerSync(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }
    
    if (this.peers.size === 0) {
      console.log('No peers connected, cannot sync');
      return;
    }
    
    this.syncInProgress = true;
    this.events.emit('sync-started');
    
    try {
      // Sync with all connected peers
      const syncPromises = [];
      
      for (const [peerId, peer] of this.peers.entries()) {
        syncPromises.push(this.syncWithPeer(peer));
      }
      
      await Promise.all(syncPromises);
      
      this.syncInProgress = false;
      this.events.emit('sync-completed');
    } catch (error) {
      this.syncInProgress = false;
      this.events.emit('sync-error', error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * Register an event listener
   * @param event Event name
   * @param listener Event listener
   */
  public on<K extends keyof WebRTCEvents>(event: K, listener: WebRTCEvents[K]): void {
    this.events.on(event, listener);
  }
  
  /**
   * Remove an event listener
   * @param event Event name
   * @param listener Event listener
   */
  public off<K extends keyof WebRTCEvents>(event: K, listener: WebRTCEvents[K]): void {
    this.events.off(event, listener);
  }
  
  /**
   * Set up signaling event listeners
   */
  private setupSignalingListeners(): void {
    // When we join a room, connect to all existing peers
    this.signaling.on('room-joined', ({ peers }) => {
      console.log(`Joined room with ${peers.length} existing peers`);
      
      if (peers.length > 0) {
        for (const peerId of peers) {
          this.initConnection(peerId, true); // We initiate the connection
        }
      } else {
        // No peers yet, but we're connected to the room
        this.setConnectionState(ConnectionState.CONNECTED);
      }
    });
    
    // When a new peer joins, wait for them to initiate
    this.signaling.on('peer-joined', ({ peerId }) => {
      console.log(`New peer joined: ${peerId}`);
      // We don't initiate, we wait for their signal
      this.initConnection(peerId, false);
    });
    
    // Handle incoming signals
    this.signaling.on('signal', ({ peerId, signal }) => {
      const peer = this.peers.get(peerId);
      
      if (peer) {
        peer.signal(signal);
      } else {
        console.error(`Received signal for unknown peer: ${peerId}`);
      }
    });
    
    // Handle signaling errors
    this.signaling.on('error', (error) => {
      console.error('Signaling error:', error);
      this.setConnectionState(ConnectionState.ERROR);
    });
    
    // Handle signaling disconnection
    this.signaling.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      // Don't change the connection state here, as we might reconnect
      // and the WebRTC connections might still be active
    });
  }
  
  /**
   * Initialize a connection with a remote peer
   * @param peerId ID of the peer
   * @param initiator Whether we are the initiator of the connection
   */
  private initConnection(peerId: string, initiator: boolean): void {
    // Don't create duplicate connections
    if (this.peers.has(peerId)) {
      console.log(`Already have a connection to peer ${peerId}`);
      return;
    }
    
    console.log(`Initializing connection to peer ${peerId} (initiator: ${initiator})`);
    
    const peer = new Peer({
      initiator,
      trickle: true,
      config: { 
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ] 
      }
    });
    
    this.setupPeerEvents(peer, peerId);
    this.peers.set(peerId, peer);
  }
  
  /**
   * Set up event listeners for a peer connection
   * @param peer Peer instance
   * @param peerId ID of the peer
   */
  private setupPeerEvents(peer: Peer.Instance, peerId: string): void {
    // Handle connection established
    peer.on('connect', () => {
      console.log(`Connected to peer: ${peerId}`);
      this.events.emit('peer-connected', peerId);
      this.setConnectionState(ConnectionState.CONNECTED);
      
      // Automatically sync data when connected
      this.syncWithPeer(peer).catch(error => {
        console.error(`Error syncing with peer ${peerId}:`, error);
      });
    });
    
    // Handle incoming data
    peer.on('data', (data: Uint8Array) => {
      try {
        const syncData = JSON.parse(new TextDecoder().decode(data));
        this.processSyncData(syncData);
      } catch (error) {
        console.error('Error processing sync data:', error);
      }
    });
    
    // Handle signaling data (ICE candidates, SDP offers/answers)
    peer.on('signal', (data: any) => {
      if (this.roomId) {
        this.signaling.sendSignal(peerId, data, this.roomId);
      }
    });
    
    // Handle errors
    peer.on('error', (err: Error) => {
      console.error(`Peer connection error with ${peerId}:`, err.message);
      this.handleConnectionError(peerId);
    });
    
    // Handle connection close
    peer.on('close', () => {
      console.log(`Connection to peer ${peerId} closed`);
      this.peers.delete(peerId);
      this.events.emit('peer-disconnected', peerId);
      
      // Update connection state if no peers left
      if (this.peers.size === 0) {
        this.setConnectionState(ConnectionState.DISCONNECTED);
      }
    });
  }
  
  /**
   * Sync data with a connected peer
   * @param peer Peer instance
   */
  private async syncWithPeer(peer: Peer.Instance): Promise<void> {
    try {
      // Get all branches
      const branches = await ConversationStore.getAllBranches();
      
      // For now, we'll create a placeholder for snapshots since the method doesn't exist yet
      const snapshots = await this.getAllSnapshots();
      
      const syncData = {
        type: 'full-sync',
        branches,
        snapshots,
        timestamp: Date.now()
      };
      
      // Send data to peer
      peer.send(new TextEncoder().encode(JSON.stringify(syncData)));
    } catch (error) {
      console.error('Error syncing data:', error);
      throw error;
    }
  }
  
  /**
   * Process incoming sync data
   * @param syncData Sync data
   */
  private async processSyncData(syncData: any): Promise<void> {
    if (syncData.type === 'full-sync') {
      console.log(`Received sync data with ${syncData.branches.length} branches and ${syncData.snapshots.length} snapshots`);
      
      try {
        // Merge incoming branches and snapshots with local data
        await this.mergeSyncData(syncData.branches, syncData.snapshots);
      } catch (error) {
        console.error('Error merging sync data:', error);
      }
    }
  }
  
  /**
   * Merge incoming data with local data
   * @param branches Branches to merge
   * @param snapshots Snapshots to merge
   */
  private async mergeSyncData(branches: Branch[], snapshots: Snapshot[]): Promise<void> {
    // Import branches and snapshots
    if (branches && branches.length > 0) {
      await this.importBranches(branches);
    }
    
    if (snapshots && snapshots.length > 0) {
      await this.importSnapshots(snapshots);
    }
  }
  
  /**
   * Temporary method to get all snapshots
   * This will be replaced by ConversationStore.getAllSnapshots() later
   */
  private async getAllSnapshots(): Promise<Snapshot[]> {
    // For now, return an empty array
    return [];
  }
  
  /**
   * Temporary method to import branches
   * This will be replaced by ConversationStore.importBranches() later
   */
  private async importBranches(branches: Branch[]): Promise<void> {
    console.log('Importing branches:', branches.length);
    // Implementation will be added later
  }
  
  /**
   * Temporary method to import snapshots
   * This will be replaced by ConversationStore.importSnapshots() later
   */
  private async importSnapshots(snapshots: Snapshot[]): Promise<void> {
    console.log('Importing snapshots:', snapshots.length);
    // Implementation will be added later
  }
  
  /**
   * Handle a connection error
   * @param peerId ID of the peer
   */
  private handleConnectionError(peerId: string): void {
    const peer = this.peers.get(peerId);
    
    if (peer) {
      // Clean up the peer connection
      peer.destroy();
      this.peers.delete(peerId);
      this.events.emit('peer-disconnected', peerId);
      
      // Update connection state if no peers left
      if (this.peers.size === 0) {
        this.setConnectionState(ConnectionState.ERROR);
      }
    }
  }
  
  /**
   * Set the connection state and emit an event
   * @param state New connection state
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.events.emit('connection-state-changed', state);
    }
  }
}
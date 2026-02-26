import EventHandler, { ACTIVE_STREAM_RECEIVED, MANUAL_RECONNECT_REQUIRED, NETWORK_OFFLINE, NETWORK_ONLINE, NO_STREAMS_AVAILABLE, PEER_CLOSED, PEER_CONNECTED, PEER_DISCONNECTED, PEER_ERROR, PEER_RECONNECT_FAILED, STREAM_LOST, STREAM_LOST_GENERIC, STREAM_RECEIVED, STREAM_SWITCHED } from "../utils/Events";
import { MediaConnection, Peer } from "peerjs";
import * as uuid from "uuid";
import RestService from "./RestService";
import Model from "../store/Model";
import View from "../view/View";

const id = (device: string = !!screen.orientation ? "static-" : "mobile-"): string => device + uuid.v4();

export class StreamProvider {
  private _streamers: Map<string, Streamer> = new Map();
  private _streams: Map<string, MediaStream>;
  private _index: number = 0;
  private _peer: Peer | null = null;
  private _activeStreamerId: string | null = null;
  private _isInitialized: boolean = false;
  private _isNetworkOffline: boolean = false;
  private _reconnectTimeout: NodeJS.Timeout | null = null;
  private _streamCleanupTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private _peerReconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS: number = 10;
  private readonly RECONNECT_DELAY: number = 3000;

  constructor() {

    window.addEventListener('online', this.handleNetworkOnline.bind(this));
    window.addEventListener('offline', this.handleNetworkOffline.bind(this));

    window.onbeforeunload = () => this.destroy();
    window.onpagehide = () => this.destroy();
  }

  public initialize = async (local: boolean = false, streams: Map<string, MediaStream> = undefined) => {
    if (local) {
      this._streams = streams;
      this.initializeLocalStream();
    } else {
      await this.initializePeerStream();
    }

    this._isInitialized = true;
    return this;
  }

  public switchStreamQuality = (quality: string) => {
    if (this._streams) {
      View.displayStream(this._streams.get(quality));
    }
  }

  public getNextStream = (): MediaStream | null => {
    const activeStreamers = Array.from(this._streamers.values()).filter(s => s.stream);

    if (activeStreamers.length === 0) {
      EventHandler.dispatchEvent(NO_STREAMS_AVAILABLE);
      return null;
    }

    if (this._index >= activeStreamers.length - 1) {
      this._index = 0;
    } else {
      this._index = this._index + 1;
    }

    const streamer = activeStreamers[this._index];
    this._activeStreamerId = streamer?.id || null;
    
    return streamer?.stream || null;
  }

  public getNextStreamSilently = (): MediaStream | null => {
    const activeStreamers = Array.from(this._streamers.values()).filter(s => s.stream);

    if (activeStreamers.length === 0) {
      EventHandler.dispatchEvent(NO_STREAMS_AVAILABLE);
      return null;
    }

    let index = this._index;
    if (index >= activeStreamers.length - 1) {
      index = 0;
    } else {
      index = index + 1;
    }

    const streamer = activeStreamers[index];
   // this._activeStreamerId = streamer?.id || null;
    
    return streamer?.stream || null;
  }

  public switchToStreamer = (streamerId: string): MediaStream | null => {
    const streamer = this._streamers.get(streamerId);
    if (streamer?.stream) {
      this._activeStreamerId = streamerId;
      return streamer.stream;
    }
    return null;
  }

  public getActiveStreamerId = (): string | null => {
    return this._activeStreamerId;
  }

  public getAllStreamers = (): Array<{id: string, hasStream: boolean}> => {
    return Array.from(this._streamers.entries()).map(([id, streamer]) => ({
      id,
      hasStream: !!streamer.stream
    }));
  }

  public triggerReconnect = () => {
    console.log('[StreamProvider] Manual reconnect triggered');
    this.reconnectPeer();
  }

  private getAllPeersIds = async (): Promise<void> => {
    try {
      if (this._isNetworkOffline) {
        console.log('[StreamProvider] Network offline, skipping peer list fetch');
        return;
      }

      const response = await RestService.getPeersIds();
      const peerIds = response.data?.data as Array<string> || [];
      Model.streamersTotalCount = peerIds.length;
      
      // Remove streamers that no longer exist
      const currentIds = new Set(peerIds);
      for (const [id, streamer] of this._streamers) {
        if (!currentIds.has(id)) {
          this.handleStreamLost(id, 'streamer_removed_from_server');
        }
      }
      
      // Add new streamers
      peerIds.forEach((id: string) => {
        if (!this._streamers.has(id)) {
          this._streamers.set(id, new Streamer(id));
        }
      });
      
    } catch (error) {
      console.error('[StreamProvider] Failed to get peer IDs:', error);
    }
  }

  private handleNetworkOnline = () => {
    console.log('[StreamProvider] Network is back online');
    this._isNetworkOffline = false;
    EventHandler.dispatchEvent(NETWORK_ONLINE);
    
    // Reset reconnect attempts
    this._peerReconnectAttempts = 0;
    
    // Clear any pending reconnect
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
    
    // Reconnect immediately
    this.reconnectPeer();
  }

  private handleNetworkOffline = () => {
    console.log('[StreamProvider] Network went offline');
    this._isNetworkOffline = true;
    EventHandler.dispatchEvent(NETWORK_OFFLINE);
    
    // Clear all streams immediately
    this.clearAllStreams('network_offline');
  }

  private clearAllStreams = (reason: string) => {
    console.log(`[StreamProvider] Clearing all streams due to: ${reason}`);
    
    // Clear active stream first
    if (this._activeStreamerId) {
      const activeStreamer = this._streamers.get(this._activeStreamerId);
      if (activeStreamer?.stream) {
        EventHandler.dispatchEvent(STREAM_LOST, {
          streamerId: this._activeStreamerId,
          reason,
          timestamp: Date.now()
        });
      }
    }
    
    // Clear all streams
    this._streamers.forEach(streamer => {
      if (streamer.stream) {
        this.cleanupStream(streamer.id);
      }
    });
  }

  private cleanupStream = (streamerId: string) => {
    const streamer = this._streamers.get(streamerId);
    if (!streamer) return;
    
    // Clear any existing cleanup timeout
    const existingTimeout = this._streamCleanupTimeouts.get(streamerId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this._streamCleanupTimeouts.delete(streamerId);
    }
    
    // Schedule immediate cleanup
    const cleanupTimeout = setTimeout(() => {
      if (streamer.stream) {
        console.log(`[StreamProvider] Cleaning up stream for ${streamerId}`);
        
        // Stop all tracks
        streamer.stream.getTracks().forEach(track => {
          track.stop();
          if (streamer.stream) {
            streamer.stream.removeTrack(track);
          }
        });
        
        // Set stream to null
        streamer.stream = null;
        
        // Dispatch generic stream lost event
        EventHandler.dispatchEvent(STREAM_LOST_GENERIC, {
          streamerId,
          reason: 'cleanup',
          timestamp: Date.now()
        });
        
        this._streamCleanupTimeouts.delete(streamerId);
      }
    }, 0);
    
    this._streamCleanupTimeouts.set(streamerId, cleanupTimeout);
  }

  private initializePeerStream = async () => {
    console.log('[StreamProvider] Initializing peer stream');
    
    await this.getAllPeersIds();
    
    this.startPeerListRefresh();
    
    this.createPeer();
  }

  private createPeer = () => {
    console.log('[StreamProvider] Creating new peer instance');
    
    // Clean up old peer if exists
    this.destroyPeer();
    
    const params = {
      host: "195.137.244.53",//"nodejs-peer-server.onrender.com",
      port: 9000,
      path: "/peer",
     // secure: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    };
    
    this._peer = new Peer(id(), params);
    
    this.setupPeerEventHandlers();
  }

  private destroyPeer = () => {
    if (this._peer) {
      console.log('[StreamProvider] Destroying old peer');
      
      // Remove all listeners
      this._peer.off('open');
      this._peer.off('disconnected');
      this._peer.off('close');
      this._peer.off('error');
      this._peer.off('call');
      
      // Destroy peer
      try {
        this._peer.disconnect();
        this._peer.destroy();
      } catch (error) {
        console.error('[StreamProvider] Error destroying peer:', error);
      }
      
      this._peer = null;
    }
    
    // Clear reconnect timeout
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
  }

  private setupPeerEventHandlers = () => {
    if (!this._peer) return;
    
    this._peer.on('open', () => {
      console.log('[StreamProvider] Peer connected with ID:', this._peer!.id);
      this._peerReconnectAttempts = 0;
      EventHandler.dispatchEvent(PEER_CONNECTED, { peerId: this._peer!.id });
      
      // Connect to all streamers
      this.connectToAllStreamers();
      
      // Set up call handler
      this.setupCallHandler();
    });
    
    this._peer.on('disconnected', () => {
      console.log('[StreamProvider] Peer disconnected');
      EventHandler.dispatchEvent(PEER_DISCONNECTED);
      this.clearAllStreams('peer_disconnected');
      this.reconnectPeer();
    });
    
    this._peer.on('close', () => {
      console.log('[StreamProvider] Peer connection closed');
      EventHandler.dispatchEvent(PEER_CLOSED);
      this.clearAllStreams('peer_closed');
      this.reconnectPeer();
    });
    
    this._peer.on('error', (error) => {
      console.error('[StreamProvider] Peer error:', error.type, error.message);
      
      if (error.type === 'network') {
        this.clearAllStreams('network_error');
      }
      
      EventHandler.dispatchEvent(PEER_ERROR, error);
      this.reconnectPeer();
    });
  }

  private setupCallHandler = () => {
    if (!this._peer) return;
    
    this._peer.on('call', (call: MediaConnection) => {
      console.log('[StreamProvider] Incoming call from:', call.peer);
      
      call.on('stream', (stream: MediaStream) => {
        console.log('[StreamProvider] Stream received from:', call.peer);
        
        const streamer = this._streamers.get(call.peer);
        if (streamer) {
          // Clean up old stream first
          //this.cleanupStream(call.peer);
          
          // Set new stream
          streamer.setStream(stream);
          
          // Dispatch STREAM_RECEIVED event
          console.log('[StreamProvider] Dispatching STREAM_RECEIVED for:', call.peer);
          EventHandler.dispatchEvent(STREAM_RECEIVED, {
            streamerId: call.peer,
            stream: stream,
            timestamp: Date.now()
          });
          
          // If this is the active streamer, also dispatch active stream received
          if (this._activeStreamerId === call.peer) {
            EventHandler.dispatchEvent(ACTIVE_STREAM_RECEIVED, {
              streamerId: call.peer,
              stream: stream,
              timestamp: Date.now()
            });
          }
        } else {
          console.error('[StreamProvider] Received stream for unknown streamer:', call.peer);
        }
      });
      
      call.on('close', () => {
        console.log('[StreamProvider] Call closed from:', call.peer);
        this.handleStreamLost(call.peer, 'call_closed');
      });
      
      call.on('error', (error) => {
        console.error('[StreamProvider] Call error from:', call.peer, error);
        this.handleStreamLost(call.peer, 'call_error');
      });
      
      // Answer the call
      call.answer(null);
    });
  }

  private connectToAllStreamers = () => {
    if (!this._peer) return;
    
    const streamerIds = Array.from(this._streamers.keys());
    console.log(`[StreamProvider] Connecting to ${streamerIds.length} streamers`);
    
    streamerIds.forEach((streamerId, index) => {
      setTimeout(() => {
        this.connectToStreamer(streamerId);
      }, index * 500); // Stagger connections
    });
  }

  private connectToStreamer = (streamerId: string) => {
    if (!this._peer) {
      console.log('[StreamProvider] No peer available for connection');
      return;
    }
    
    try {
      console.log(`[StreamProvider] Connecting to streamer: ${streamerId}`);
      const connection = this._peer.connect(streamerId, {
        reliable: true,
        serialization: 'json'
      });
      
      connection?.on('open', () => {
        console.log(`[StreamProvider] Connected to streamer: ${streamerId}`);
        connection.send({ type: 'custom-media-stream-request', quality: Model.prefferedStreamQuality });
      });
      
      connection?.on('close', () => {
        console.log(`[StreamProvider] Connection closed to streamer: ${streamerId}`);
        this.handleStreamLost(streamerId, 'connection_closed');
      });
      
      connection?.on('error', (error) => {
        console.error(`[StreamProvider] Connection error to streamer: ${streamerId}`, error);
        this.handleStreamLost(streamerId, 'connection_error');
      });
      
    } catch (error) {
      console.error(`[StreamProvider] Failed to connect to streamer: ${streamerId}`, error);
      this.handleStreamLost(streamerId, 'connection_failed');
    }
  }

  private handleStreamLost = (streamerId: string, reason: string) => {
    console.log(`[StreamProvider] Stream lost from ${streamerId}, reason: ${reason}`);
    
    // Clean up the stream
    this.cleanupStream(streamerId);
    
    // If this is the active streamer, dispatch STREAM_LOST event
    if (this._activeStreamerId === streamerId) {
      EventHandler.dispatchEvent(STREAM_LOST, {
        streamerId,
        reason,
        timestamp: Date.now()
      });
      
      // Try to switch to another stream
      const nextStream = this.getNextStream();
      if (nextStream) {
        EventHandler.dispatchEvent(STREAM_SWITCHED, {
          from: streamerId,
          to: this._activeStreamerId,
          stream: nextStream
        });
      }
    }
  }

  private reconnectPeer = () => {
    // Clear any existing timeout
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
    
    // Check max attempts
    if (this._peerReconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('[StreamProvider] Max reconnect attempts reached');
      EventHandler.dispatchEvent(PEER_RECONNECT_FAILED);
      EventHandler.dispatchEvent(MANUAL_RECONNECT_REQUIRED);
      return;
    }
    
    this._peerReconnectAttempts++;
    
    // Calculate delay with exponential backoff, capped at 30 seconds
    const delay = Math.min(
      this.RECONNECT_DELAY * Math.pow(1.5, this._peerReconnectAttempts - 1),
      30000
    );
    
    //console.log(`[StreamProvider] Will recreate peer in ${delay}ms (attempt ${this._peerReconnectAttempts})`);
    
    /*this._reconnectTimeout = setTimeout(() => {
      console.log('[StreamProvider] Recreating peer...');
      this.createPeer();
    }, delay);*/
  }

  private startPeerListRefresh = () => {
    // Refresh peer list every 30 seconds
    setInterval(async () => {
      try {
        await this.getAllPeersIds();
        console.log('[StreamProvider] Refreshed peer list');
        // If peer is connected, connect to new streamers
        if (this._peer) {
          const streamerIds = Array.from(this._streamers.keys());
          streamerIds.forEach(streamerId => {
            const streamer = this._streamers.get(streamerId);
            if (streamer && !streamer.stream) {
              this.connectToStreamer(streamerId);
            }
          });
        }
      } catch (error) {
        console.error('[StreamProvider] Failed to refresh peer list:', error);
      }
    }, 30000);
  }

  private initializeLocalStream = () => {
    this.startPeerListRefresh();
    EventHandler.dispatchEvent(STREAM_RECEIVED);
  }

  public destroy = () => {
    console.log('[StreamProvider] Destroying...');
    
    // Remove network listeners
    window.removeEventListener('online', this.handleNetworkOnline);
    window.removeEventListener('offline', this.handleNetworkOffline);
    
    // Clear all timeouts
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
    
    this._streamCleanupTimeouts.forEach(timeout => clearTimeout(timeout));
    this._streamCleanupTimeouts.clear();
    
    // Clear all streams
    this._streamers.forEach(streamer => {
      if (streamer.stream) {
        streamer.stream.getTracks().forEach(track => track.stop());
        streamer.stream = null;
      }
    });
    this._streamers.clear();
    
    // Destroy peer
    this.destroyPeer();
    
    console.log('[StreamProvider] Destroyed');
  }
}

class Streamer {
  public id: string;
  public stream: MediaStream | null = null;

  public get pending(): boolean {
    return !this.stream;
  }

  constructor(id: string) {
    this.id = id;
  }

  public setStream = (stream: MediaStream) => {
    // Clean up old stream if exists
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    this.stream = stream;
    
    // Set up track ended listeners
    stream.getTracks().forEach(track => {
      track.onended = () => {
        console.log(`[Streamer ${this.id}] Track ended`);
        this.stream = null;
      };
    });
    
    return stream;
  }
}

export default new StreamProvider();
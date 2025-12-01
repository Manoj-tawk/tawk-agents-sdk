/**
 * Transport Layer Abstraction
 * 
 * Base abstraction for realtime transport implementations
 * (WebSocket, WebRTC, custom)
 * 
 * @module transport
 */

import { EventEmitter } from 'eventemitter3';
import type { TransportEvents, ConnectionOptions, ConnectionState } from './types';

/**
 * Transport layer interface
 * 
 * All transport implementations must implement this interface
 */
export interface TransportLayer {
  /**
   * Current connection state
   */
  readonly state: ConnectionState;

  /**
   * Connect to the realtime service
   */
  connect(options: ConnectionOptions): Promise<void>;

  /**
   * Disconnect from the service
   */
  disconnect(): Promise<void>;

  /**
   * Send a message to the server
   */
  send(message: any): void;

  /**
   * Register event listeners
   */
  on<K extends keyof TransportEvents>(
    event: K,
    listener: TransportEvents[K]
  ): void;

  /**
   * Remove event listeners
   */
  off<K extends keyof TransportEvents>(
    event: K,
    listener: TransportEvents[K]
  ): void;

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: keyof TransportEvents): void;
}

/**
 * Base transport layer implementation
 * 
 * Provides common functionality for all transports
 */
export abstract class BaseTransport
  extends EventEmitter<TransportEvents>
  implements TransportLayer
{
  protected _state: ConnectionState = 'disconnected';
  protected _options?: ConnectionOptions;
  protected _reconnectAttempts = 0;
  protected _maxReconnectAttempts = 5;
  protected _reconnectDelay = 1000;
  protected _reconnectTimeout?: NodeJS.Timeout;

  /**
   * Get current connection state
   */
  get state(): ConnectionState {
    return this._state;
  }

  /**
   * Set connection state and emit event
   */
  protected setState(state: ConnectionState): void {
    if (this._state === state) return;
    
    const previousState = this._state;
    this._state = state;
    
    console.log(`[Transport] State: ${previousState} → ${state}`);
  }

  /**
   * Connect to the service (abstract - must be implemented)
   */
  abstract connect(options: ConnectionOptions): Promise<void>;

  /**
   * Disconnect from the service (abstract - must be implemented)
   */
  abstract disconnect(): Promise<void>;

  /**
   * Send message (abstract - must be implemented)
   */
  abstract send(message: any): void;

  /**
   * Handle connection error
   */
  protected handleError(error: Error): void {
    console.error('[Transport] Error:', error);
    this.emit('error', error);

    // Attempt reconnection if enabled
    if (
      this._options?.autoReconnect &&
      this._reconnectAttempts < this._maxReconnectAttempts &&
      this._state !== 'failed'
    ) {
      this.scheduleReconnect();
    } else if (this._reconnectAttempts >= this._maxReconnectAttempts) {
      this.setState('failed');
    }
  }

  /**
   * Handle connection close
   */
  protected handleClose(code: number, reason: string): void {
    console.log(`[Transport] Closed: ${code} ${reason}`);
    this.setState('disconnected');
    this.emit('close', code, reason);

    // Attempt reconnection if enabled and not a normal close
    if (
      this._options?.autoReconnect &&
      code !== 1000 && // Normal closure
      code !== 1001 && // Going away
      this._reconnectAttempts < this._maxReconnectAttempts
    ) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  protected scheduleReconnect(): void {
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
    }

    const delay = this._reconnectDelay * Math.pow(2, this._reconnectAttempts);
    console.log(`[Transport] Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts + 1}/${this._maxReconnectAttempts})`);

    this._reconnectTimeout = setTimeout(() => {
      this._reconnectAttempts++;
      this.setState('reconnecting');
      
      if (this._options) {
        this.connect(this._options).catch((error) => {
          console.error('[Transport] Reconnection failed:', error);
          this.handleError(error);
        });
      }
    }, delay);
  }

  /**
   * Reset reconnection state
   */
  protected resetReconnection(): void {
    this._reconnectAttempts = 0;
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = undefined;
    }
  }

  /**
   * Cleanup resources
   */
  protected cleanup(): void {
    this.resetReconnection();
    this.removeAllListeners();
  }
}

/**
 * Transport factory
 * 
 * Creates the appropriate transport based on environment and options
 */
export class TransportFactory {
  /**
   * Create transport based on type
   */
  static create(type: 'webrtc' | 'websocket' | TransportLayer): TransportLayer {
    if (typeof type !== 'string') {
      // Custom transport provided
      return type;
    }

    switch (type) {
      case 'webrtc':
        // Lazy load WebRTC transport
        const { WebRTCTransport } = require('./transports/webrtc');
        return new WebRTCTransport();

      case 'websocket':
        // Lazy load WebSocket transport
        const { WebSocketTransport } = require('./transports/websocket');
        return new WebSocketTransport();

      default:
        throw new Error(`Unknown transport type: ${type}`);
    }
  }

  /**
   * Auto-detect best transport for environment
   */
  static createAuto(): TransportLayer {
    // Check if running in browser with WebRTC support
    if (typeof window !== 'undefined' && typeof RTCPeerConnection !== 'undefined') {
      console.log('[TransportFactory] Auto-selected: WebRTC');
      return this.create('webrtc');
    }

    // Fall back to WebSocket
    console.log('[TransportFactory] Auto-selected: WebSocket');
    return this.create('websocket');
  }
}


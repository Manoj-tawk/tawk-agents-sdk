/**
 * WebSocket Transport
 * 
 * WebSocket-based realtime transport for universal compatibility
 * Works on both browser and server
 * 
 * @module transports/websocket
 */

import WebSocket from 'ws';
import { BaseTransport } from '../transport';
import type { ConnectionOptions } from '../types';

/**
 * WebSocket transport implementation
 * 
 * Uses WebSocket API for realtime communication.
 * Compatible with both browser and Node.js.
 * 
 * @example
 * ```typescript
 * const transport = new WebSocketTransport();
 * await transport.connect({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'wss://api.openai.com/v1/realtime',
 * });
 * ```
 */
export class WebSocketTransport extends BaseTransport {
  private ws?: WebSocket;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private pingInterval?: NodeJS.Timeout;

  /**
   * Connect to the WebSocket endpoint
   */
  async connect(options: ConnectionOptions): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') {
      console.warn('[WebSocket] Already connected or connecting');
      return;
    }

    this._options = options;
    this.setState('connecting');

    try {
      const url = this.buildUrl(options);
      console.log(`[WebSocket] Connecting to ${url}`);

      // Create WebSocket connection
      this.ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${options.apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      // Set up event handlers
      this.ws.on('open', () => this.handleOpen());
      this.ws.on('message', (data) => this.handleMessage(data));
      this.ws.on('error', (error) => this.handleError(error));
      this.ws.on('close', (code, reason) => this.handleClose(code, reason.toString()));

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        this.once('open', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Start ping/pong to keep connection alive
      this.startPing();

    } catch (error) {
      this.setState('failed');
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket
   */
  async disconnect(): Promise<void> {
    if (!this.ws || this._state === 'disconnected') {
      return;
    }

    this.stopPing();
    this.resetReconnection();

    return new Promise<void>((resolve) => {
      if (this.ws) {
        this.ws.once('close', () => {
          this.cleanup();
          resolve();
        });

        this.ws.close(1000, 'Normal closure');
      } else {
        resolve();
      }
    });
  }

  /**
   * Send message over WebSocket
   */
  send(message: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const data = typeof message === 'string' ? message : JSON.stringify(message);
    this.ws.send(data);
  }

  /**
   * Build WebSocket URL
   */
  private buildUrl(options: ConnectionOptions): string {
    const baseUrl = options.baseUrl || 'wss://api.openai.com/v1/realtime';
    const url = new URL(baseUrl);
    
    // Add model parameter if specified
    if (options.sessionConfig?.model) {
      url.searchParams.set('model', options.sessionConfig.model);
    } else {
      url.searchParams.set('model', 'gpt-4o-realtime-preview-2024-10-01');
    }

    return url.toString();
  }

  /**
   * Handle WebSocket open
   */
  private handleOpen(): void {
    console.log('[WebSocket] Connected');
    this.setState('connected');
    this.resetReconnection();
    this.emit('open');

    // Send session configuration if provided
    if (this._options?.sessionConfig) {
      this.send({
        type: 'session.update',
        session: this._options.sessionConfig,
      });
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = typeof data === 'string' ? JSON.parse(data) : JSON.parse(data.toString());
      this.emit('message', message);
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPing(): void {
    this.stopPing();
    
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // OpenAI Realtime API doesn't require explicit pings
        // WebSocket protocol handles it automatically
      }
    }, this.PING_INTERVAL);
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }

  /**
   * Cleanup resources
   */
  protected cleanup(): void {
    super.cleanup();
    this.stopPing();
    
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws = undefined;
    }
  }
}


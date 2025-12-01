/**
 * WebRTC Transport
 * 
 * WebRTC-based realtime transport for lowest latency
 * Browser-only, with automatic audio I/O
 * 
 * @module transports/webrtc
 */

import { BaseTransport } from '../transport';
import type { ConnectionOptions } from '../types';

/**
 * WebRTC transport implementation
 * 
 * Uses WebRTC for peer-to-peer realtime communication.
 * Provides lowest latency and automatic audio handling.
 * Browser-only.
 * 
 * @example
 * ```typescript
 * const transport = new WebRTCTransport();
 * await transport.connect({
 *   apiKey: 'your-api-key',
 * });
 * // Microphone and speakers automatically configured
 * ```
 */
export class WebRTCTransport extends BaseTransport {
  private pc?: RTCPeerConnection;
  private dc?: RTCDataChannel;
  private audioStream?: MediaStream;
  private audioElement?: HTMLAudioElement;

  /**
   * Connect via WebRTC
   */
  async connect(options: ConnectionOptions): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('WebRTC transport is browser-only');
    }

    if (this._state === 'connected' || this._state === 'connecting') {
      console.warn('[WebRTC] Already connected or connecting');
      return;
    }

    this._options = options;
    this.setState('connecting');

    try {
      // Get ephemeral key
      const sessionData = await this.createEphemeralSession(options);

      // Set up WebRTC peer connection
      await this.setupPeerConnection(sessionData);

      // Get user media (microphone)
      await this.setupAudioInput();

      // Set up audio output
      this.setupAudioOutput();

      console.log('[WebRTC] Connected');
      this.setState('connected');
      this.resetReconnection();
      this.emit('open');

    } catch (error) {
      this.setState('failed');
      throw error;
    }
  }

  /**
   * Disconnect WebRTC
   */
  async disconnect(): Promise<void> {
    if (this._state === 'disconnected') {
      return;
    }

    this.stopAudio();
    this.resetReconnection();

    if (this.dc) {
      this.dc.close();
    }

    if (this.pc) {
      this.pc.close();
    }

    this.cleanup();
    this.setState('disconnected');
    this.emit('close', 1000, 'Normal closure');
  }

  /**
   * Send message over data channel
   */
  send(message: any): void {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('WebRTC data channel not open');
    }

    const data = typeof message === 'string' ? message : JSON.stringify(message);
    this.dc.send(data);
  }

  /**
   * Create ephemeral session with OpenAI
   */
  private async createEphemeralSession(options: ConnectionOptions): Promise<any> {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.sessionConfig?.model || 'gpt-4o-realtime-preview-2024-10-01',
        voice: options.sessionConfig?.voice || 'alloy',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Set up WebRTC peer connection
   */
  private async setupPeerConnection(sessionData: any): Promise<void> {
    // Create peer connection
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] ICE candidate:', event.candidate);
      }
    };

    // Handle connection state changes
    this.pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.pc?.connectionState);
      
      if (this.pc?.connectionState === 'failed') {
        this.handleError(new Error('WebRTC connection failed'));
      }
    };

    // Create data channel for control messages
    this.dc = this.pc.createDataChannel('oai-events');
    
    this.dc.onopen = () => {
      console.log('[WebRTC] Data channel opened');
    };

    this.dc.onclose = () => {
      console.log('[WebRTC] Data channel closed');
    };

    this.dc.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.emit('message', message);
      } catch (error) {
        console.error('[WebRTC] Failed to parse message:', error);
      }
    };

    // Handle remote audio track
    this.pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track');
      if (this.audioElement && event.streams[0]) {
        this.audioElement.srcObject = event.streams[0];
        this.audioElement.play().catch(console.error);
      }
    };

    // Create and send offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Exchange SDP with server (using session data)
    const answer = await this.exchangeSDP(sessionData, offer);
    await this.pc.setRemoteDescription(answer);
  }

  /**
   * Exchange SDP with OpenAI
   */
  private async exchangeSDP(sessionData: any, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    // In a real implementation, this would exchange SDP with OpenAI's WebRTC endpoint
    // For now, this is a placeholder
    console.log('[WebRTC] Exchanging SDP...');
    
    // This is where you'd POST the offer and get back an answer
    // The exact endpoint depends on OpenAI's WebRTC implementation
    
    return {
      type: 'answer',
      sdp: '', // Would come from server
    };
  }

  /**
   * Set up audio input (microphone)
   */
  private async setupAudioInput(): Promise<void> {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Add audio track to peer connection
      if (this.pc && this.audioStream) {
        this.audioStream.getTracks().forEach(track => {
          if (this.pc) {
            this.pc.addTrack(track, this.audioStream!);
          }
        });
      }

      console.log('[WebRTC] Audio input configured');
    } catch (error) {
      console.error('[WebRTC] Failed to get audio input:', error);
      throw new Error('Microphone access denied or not available');
    }
  }

  /**
   * Set up audio output (speakers)
   */
  private setupAudioOutput(): void {
    this.audioElement = document.createElement('audio');
    this.audioElement.autoplay = true;
    console.log('[WebRTC] Audio output configured');
  }

  /**
   * Stop audio streams
   */
  private stopAudio(): void {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = undefined;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.srcObject = null;
      this.audioElement = undefined;
    }
  }

  /**
   * Cleanup resources
   */
  protected cleanup(): void {
    super.cleanup();
    this.stopAudio();
    
    this.dc = undefined;
    this.pc = undefined;
  }
}


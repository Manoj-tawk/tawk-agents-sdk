/**
 * Realtime Session
 * 
 * Manages realtime voice agent sessions with WebRTC/WebSocket
 * 
 * @module session
 */

import { EventEmitter } from 'eventemitter3';
import type {
  RealtimeSessionEvents,
  ConnectionOptions,
  RealtimeContext,
  SessionState,
  AudioState,
  ConversationItem,
  TransportType,
} from './types';
import type { RealtimeAgent } from './agent';
import { TransportFactory, type TransportLayer } from './transport';

/**
 * Realtime Session Options
 */
export interface RealtimeSessionOptions<TContext = unknown> {
  /**
   * Transport type or custom transport instance
   */
  transport?: TransportType | TransportLayer;

  /**
   * Initial context
   */
  context?: TContext;

  /**
   * Auto-reconnect on disconnect
   */
  autoReconnect?: boolean;

  /**
   * Max reconnect attempts
   */
  maxReconnectAttempts?: number;
}

/**
 * Realtime Session
 * 
 * Manages a realtime voice conversation with an agent.
 * Handles transport, audio, tool execution, and handoffs.
 * 
 * @example
 * ```typescript
 * const agent = new RealtimeAgent({
 *   name: 'Assistant',
 *   instructions: 'Be helpful',
 *   voice: 'alloy',
 * });
 * 
 * const session = new RealtimeSession(agent);
 * await session.connect({ apiKey: 'sk-...' });
 * 
 * session.on('transcript', ({ text }) => {
 *   console.log('User said:', text);
 * });
 * 
 * session.on('agent_response', ({ text }) => {
 *   console.log('Agent said:', text);
 * });
 * ```
 */
export class RealtimeSession<TContext = unknown>
  extends EventEmitter<RealtimeSessionEvents<TContext>>
{
  private transport: TransportLayer;
  private currentAgent: RealtimeAgent<TContext>;
  private sessionState: SessionState;
  private audioState: AudioState;
  private conversationHistory: ConversationItem[] = [];
  private pendingToolCalls: Map<string, any> = new Map();

  constructor(
    initialAgent: RealtimeAgent<TContext>,
    options: RealtimeSessionOptions<TContext> = {}
  ) {
    super();

    this.currentAgent = initialAgent;

    // Initialize states
    this.sessionState = {
      connectionState: 'disconnected',
      config: initialAgent.getSessionConfig(),
    };

    this.audioState = {
      isInputActive: false,
      isOutputActive: false,
      inputLevel: 0,
      outputLevel: 0,
    };

    // Create transport
    if (options.transport) {
      this.transport = typeof options.transport === 'string'
        ? TransportFactory.create(options.transport)
        : options.transport;
    } else {
      this.transport = TransportFactory.createAuto();
    }

    // Set up transport event handlers
    this.setupTransportHandlers();
  }

  /**
   * Connect to realtime service
   */
  async connect(options: ConnectionOptions): Promise<void> {
    try {
      // Merge agent session config with connection options
      const mergedOptions: ConnectionOptions = {
        ...options,
        sessionConfig: {
          ...this.currentAgent.getSessionConfig(),
          ...options.sessionConfig,
        },
      };

      await this.transport.connect(mergedOptions);

      // Send session update with agent instructions
      this.sendSessionUpdate({
        instructions: this.currentAgent.instructions,
        tools: this.currentAgent.getAllTools(),
        ...mergedOptions.sessionConfig,
      });

      this.emit('connected');
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from realtime service
   */
  async disconnect(): Promise<void> {
    await this.transport.disconnect();
    this.emit('disconnected', 1000, 'Normal closure');
  }

  /**
   * Send audio data
   */
  sendAudio(audio: ArrayBuffer): void {
    this.transport.send({
      type: 'input_audio_buffer.append',
      audio: this.arrayBufferToBase64(audio),
    });
  }

  /**
   * Commit audio buffer
   */
  commitAudio(): void {
    this.transport.send({
      type: 'input_audio_buffer.commit',
    });
  }

  /**
   * Clear audio buffer
   */
  clearAudio(): void {
    this.transport.send({
      type: 'input_audio_buffer.clear',
    });
  }

  /**
   * Create a response (trigger agent to speak)
   */
  createResponse(): void {
    this.transport.send({
      type: 'response.create',
    });
  }

  /**
   * Cancel current response
   */
  cancelResponse(): void {
    this.transport.send({
      type: 'response.cancel',
    });
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationItem[] {
    return [...this.conversationHistory];
  }

  /**
   * Get current session state
   */
  getSessionState(): SessionState {
    return { ...this.sessionState };
  }

  /**
   * Get current audio state
   */
  getAudioState(): AudioState {
    return { ...this.audioState };
  }

  /**
   * Get current agent
   */
  getCurrentAgent(): RealtimeAgent<TContext> {
    return this.currentAgent;
  }

  /**
   * Set up transport event handlers
   */
  private setupTransportHandlers(): void {
    this.transport.on('open', () => {
      this.sessionState.connectionState = 'connected';
      this.emit('session_updated', this.sessionState);
    });

    this.transport.on('close', (code, reason) => {
      this.sessionState.connectionState = 'disconnected';
      this.emit('session_updated', this.sessionState);
    });

    this.transport.on('error', (error) => {
      this.emit('error', error);
    });

    this.transport.on('message', (message) => {
      this.handleMessage(message);
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: any): void {
    const { type } = message;

    switch (type) {
      case 'session.created':
      case 'session.updated':
        this.handleSessionUpdate(message);
        break;

      case 'response.audio.delta':
        this.handleAudioDelta(message);
        break;

      case 'response.text.delta':
        this.handleTextDelta(message);
        break;

      case 'response.function_call_arguments.delta':
        this.handleFunctionCallDelta(message);
        break;

      case 'response.function_call_arguments.done':
        this.handleFunctionCallDone(message);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        this.handleTranscript(message);
        break;

      case 'response.done':
        this.handleResponseDone(message);
        break;

      case 'rate_limits.updated':
        this.handleRateLimits(message);
        break;

      case 'error':
        this.emit('error', new Error(message.error?.message || 'Unknown error'));
        break;

      default:
        // Ignore unknown message types
        break;
    }
  }

  /**
   * Handle session update
   */
  private handleSessionUpdate(message: any): void {
    this.sessionState.id = message.session?.id;
    this.emit('session_updated', this.sessionState);
  }

  /**
   * Handle audio delta
   */
  private handleAudioDelta(message: any): void {
    const audio = this.base64ToArrayBuffer(message.delta);
    this.emit('audio', { audio });
    
    this.audioState.isOutputActive = true;
    this.emit('audio_state_updated', this.audioState);
  }

  /**
   * Handle text delta
   */
  private handleTextDelta(message: any): void {
    this.emit('agent_response', {
      text: message.delta,
      isDelta: true,
    });
  }

  /**
   * Handle function call delta
   */
  private handleFunctionCallDelta(message: any): void {
    const { call_id, delta } = message;
    
    if (!this.pendingToolCalls.has(call_id)) {
      this.pendingToolCalls.set(call_id, {
        callId: call_id,
        arguments: '',
      });
    }

    const pending = this.pendingToolCalls.get(call_id);
    pending.arguments += delta;
  }

  /**
   * Handle function call done
   */
  private async handleFunctionCallDone(message: any): Promise<void> {
    const { call_id, name, arguments: args } = message;

    this.emit('tool_call', {
      callId: call_id,
      toolName: name,
      arguments: JSON.parse(args),
    });

    // Check if it's a handoff
    if (this.currentAgent.isHandoffTool(name)) {
      await this.handleHandoff(call_id, name, JSON.parse(args));
      return;
    }

    // Execute tool
    const tool = this.currentAgent.tools.find(
      t => t.description.toLowerCase().includes(name.toLowerCase())
    );

    if (tool) {
      try {
        const result = await tool.execute(JSON.parse(args));
        
        this.emit('tool_result', {
          callId: call_id,
          toolName: name,
          result,
        });

        // Send result back
        this.transport.send({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id,
            output: JSON.stringify(result),
          },
        });

        // Trigger response
        this.createResponse();
      } catch (error) {
        this.emit('error', error as Error);
      }
    }

    this.pendingToolCalls.delete(call_id);
  }

  /**
   * Handle handoff
   */
  private async handleHandoff(callId: string, toolName: string, args: any): Promise<void> {
    const targetAgent = this.currentAgent.getHandoffTarget(toolName);

    if (targetAgent) {
      const previousAgent = this.currentAgent;
      this.currentAgent = targetAgent;

      this.emit('handoff', {
        fromAgent: previousAgent.name,
        toAgent: targetAgent.name,
        reason: args.reason,
      });

      // Update session with new agent
      this.sendSessionUpdate({
        instructions: targetAgent.instructions,
        tools: targetAgent.getAllTools(),
      });

      // Send handoff response
      this.transport.send({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify({
            success: true,
            message: `Handed off to ${targetAgent.name}`,
          }),
        },
      });

      // Trigger response from new agent
      this.createResponse();
    }
  }

  /**
   * Handle transcript
   */
  private handleTranscript(message: any): void {
    this.emit('transcript', {
      text: message.transcript,
      isFinal: true,
    });
  }

  /**
   * Handle response done
   */
  private handleResponseDone(message: any): void {
    this.emit('response_completed');
    
    this.audioState.isOutputActive = false;
    this.emit('audio_state_updated', this.audioState);
  }

  /**
   * Handle rate limits
   */
  private handleRateLimits(message: any): void {
    this.sessionState.rateLimits = message.rate_limits;
    this.emit('rate_limits_updated', message.rate_limits);
  }

  /**
   * Send session update
   */
  private sendSessionUpdate(config: any): void {
    this.transport.send({
      type: 'session.update',
      session: config,
    });
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}


/**
 * Realtime Agents - Type Definitions
 * 
 * Core types for realtime voice agents
 * 
 * @module types
 */

import type { Agent, CoreTool } from 'tawk-agents-sdk';

/**
 * Voice options for realtime agents
 */
export type RealtimeVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * Transport layer type
 */
export type TransportType = 'webrtc' | 'websocket' | 'custom';

/**
 * Audio format
 */
export type AudioFormat = 'pcm16' | 'g711_ulaw' | 'g711_alaw';

/**
 * Realtime event types
 */
export type RealtimeEventType =
  | 'session.created'
  | 'session.updated'
  | 'input_audio_buffer.append'
  | 'input_audio_buffer.commit'
  | 'input_audio_buffer.clear'
  | 'conversation.item.create'
  | 'response.create'
  | 'response.cancel'
  | 'session.update'
  | 'error'
  | 'rate_limits.updated'
  | 'response.audio.delta'
  | 'response.audio.done'
  | 'response.text.delta'
  | 'response.text.done'
  | 'response.function_call_arguments.delta'
  | 'response.function_call_arguments.done'
  | 'response.done'
  | 'conversation.item.input_audio_transcription.completed'
  | 'conversation.item.input_audio_transcription.failed';

/**
 * Connection state
 */
export type ConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

/**
 * Audio configuration
 */
export interface AudioConfig {
  /**
   * Sample rate (default: 24000)
   */
  sampleRate?: number;

  /**
   * Audio format (default: 'pcm16')
   */
  format?: AudioFormat;

  /**
   * Enable automatic gain control
   */
  autoGainControl?: boolean;

  /**
   * Enable noise suppression
   */
  noiseSuppression?: boolean;

  /**
   * Enable echo cancellation
   */
  echoCancellation?: boolean;
}

/**
 * Session configuration
 */
export interface SessionConfig {
  /**
   * Model to use (default: 'gpt-4o-realtime-preview')
   */
  model?: string;

  /**
   * Voice to use
   */
  voice?: RealtimeVoice;

  /**
   * Audio input configuration
   */
  input?: AudioConfig;

  /**
   * Audio output configuration
   */
  output?: AudioConfig;

  /**
   * Turn detection settings
   */
  turnDetection?: {
    type: 'server_vad';
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
  } | null;

  /**
   * Temperature for responses
   */
  temperature?: number;

  /**
   * Max response tokens
   */
  maxResponseOutputTokens?: number | 'inf';
}

/**
 * Connection options
 */
export interface ConnectionOptions {
  /**
   * API key for authentication
   */
  apiKey: string;

  /**
   * Base URL (optional, for custom endpoints)
   */
  baseUrl?: string;

  /**
   * Session configuration
   */
  sessionConfig?: SessionConfig;

  /**
   * Reconnect automatically on disconnect
   */
  autoReconnect?: boolean;

  /**
   * Max reconnection attempts
   */
  maxReconnectAttempts?: number;
}

/**
 * Realtime context data
 */
export interface RealtimeContext<TBaseContext = unknown> {
  /**
   * Base context from user
   */
  context: TBaseContext;

  /**
   * Conversation history
   */
  history: ConversationItem[];

  /**
   * Current session state
   */
  sessionState: SessionState;

  /**
   * Audio state
   */
  audioState: AudioState;
}

/**
 * Session state
 */
export interface SessionState {
  /**
   * Session ID
   */
  id?: string;

  /**
   * Connection state
   */
  connectionState: ConnectionState;

  /**
   * Current configuration
   */
  config: SessionConfig;

  /**
   * Rate limit information
   */
  rateLimits?: {
    name: string;
    limit: number;
    remaining: number;
    reset_seconds: number;
  }[];
}

/**
 * Audio state
 */
export interface AudioState {
  /**
   * Is audio input active
   */
  isInputActive: boolean;

  /**
   * Is audio output active
   */
  isOutputActive: boolean;

  /**
   * Input volume level (0-1)
   */
  inputLevel: number;

  /**
   * Output volume level (0-1)
   */
  outputLevel: number;
}

/**
 * Conversation item
 */
export interface ConversationItem {
  /**
   * Item ID
   */
  id: string;

  /**
   * Item type
   */
  type: 'message' | 'function_call' | 'function_call_output';

  /**
   * Role
   */
  role?: 'user' | 'assistant' | 'system';

  /**
   * Content
   */
  content?: Array<{
    type: 'text' | 'audio' | 'input_text' | 'input_audio';
    text?: string;
    audio?: string;
    transcript?: string;
  }>;

  /**
   * Function call details (if type is function_call)
   */
  call_id?: string;
  name?: string;
  arguments?: string;

  /**
   * Function output (if type is function_call_output)
   */
  output?: string;
}

/**
 * Realtime agent configuration
 */
export interface RealtimeAgentConfig<TContext = unknown> {
  /**
   * Agent name
   */
  name: string;

  /**
   * Agent instructions (system prompt)
   */
  instructions: string;

  /**
   * Voice to use
   */
  voice?: RealtimeVoice;

  /**
   * Tools available to the agent
   */
  tools?: CoreTool[];

  /**
   * Other realtime agents to handoff to
   */
  handoffs?: RealtimeAgent<TContext>[];

  /**
   * Handoff description for LLM
   */
  handoffDescription?: string;

  /**
   * Session configuration
   */
  sessionConfig?: SessionConfig;

  /**
   * Initial context
   */
  context?: TContext;
}

/**
 * Realtime agent class placeholder
 * (Will be defined in agent.ts)
 */
export interface RealtimeAgent<TContext = unknown> {
  name: string;
  instructions: string;
  voice?: RealtimeVoice;
  tools?: CoreTool[];
  handoffs?: RealtimeAgent<TContext>[];
  handoffDescription?: string;
  sessionConfig?: SessionConfig;
}

/**
 * Transport layer events
 */
export interface TransportEvents {
  /**
   * Connection opened
   */
  open: () => void;

  /**
   * Connection closed
   */
  close: (code: number, reason: string) => void;

  /**
   * Error occurred
   */
  error: (error: Error) => void;

  /**
   * Message received
   */
  message: (data: any) => void;
}

/**
 * Session events
 */
export interface RealtimeSessionEvents<TContext = unknown> {
  /**
   * Session connected
   */
  connected: () => void;

  /**
   * Session disconnected
   */
  disconnected: (code: number, reason: string) => void;

  /**
   * Error occurred
   */
  error: (error: Error) => void;

  /**
   * Audio received from agent
   */
  audio: (data: { audio: ArrayBuffer; transcript?: string }) => void;

  /**
   * Transcript of user input
   */
  transcript: (data: { text: string; isFinal: boolean }) => void;

  /**
   * Agent response text
   */
  agent_response: (data: { text: string; isDelta: boolean }) => void;

  /**
   * Tool call requested
   */
  tool_call: (data: { 
    callId: string;
    toolName: string;
    arguments: any;
  }) => void;

  /**
   * Tool call completed
   */
  tool_result: (data: {
    callId: string;
    toolName: string;
    result: any;
  }) => void;

  /**
   * Agent handoff
   */
  handoff: (data: {
    fromAgent: string;
    toAgent: string;
    reason?: string;
  }) => void;

  /**
   * Session state updated
   */
  session_updated: (state: SessionState) => void;

  /**
   * Audio state updated
   */
  audio_state_updated: (state: AudioState) => void;

  /**
   * Rate limits updated
   */
  rate_limits_updated: (limits: SessionState['rateLimits']) => void;

  /**
   * Response started
   */
  response_started: () => void;

  /**
   * Response completed
   */
  response_completed: () => void;
}


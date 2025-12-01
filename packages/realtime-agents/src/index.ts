/**
 * Tawk Realtime Agents
 * 
 * Realtime voice agents for Tawk Agents SDK
 * 
 * @packageDocumentation
 * @module @tawk/realtime-agents
 */

// Core exports
export { RealtimeAgent, createRealtimeAgent } from './agent';
export { RealtimeSession } from './session';

// Transport exports
export { TransportFactory, BaseTransport } from './transport';
export type { TransportLayer } from './transport';

// Transport implementations
export { WebSocketTransport } from './transports/websocket';
export { WebRTCTransport } from './transports/webrtc';

// Types
export type {
  // Agent types
  RealtimeAgentConfig,
  RealtimeVoice,
  
  // Session types
  SessionConfig,
  ConnectionOptions,
  RealtimeContext,
  SessionState,
  AudioState,
  
  // Event types
  RealtimeSessionEvents,
  RealtimeEventType,
  
  // Transport types
  TransportType,
  AudioConfig,
  AudioFormat,
  ConnectionState,
  
  // Conversation types
  ConversationItem,
} from './types';

/**
 * Package version
 */
export const VERSION = '0.1.0';

/**
 * Check if environment supports WebRTC
 */
export function hasWebRTCSupport(): boolean {
  return typeof window !== 'undefined' && typeof RTCPeerConnection !== 'undefined';
}

/**
 * Check if environment supports WebSocket
 */
export function hasWebSocketSupport(): boolean {
  return typeof WebSocket !== 'undefined';
}

/**
 * Get recommended transport for current environment
 */
export function getRecommendedTransport(): TransportType {
  if (hasWebRTCSupport()) {
    return 'webrtc';
  }
  return 'websocket';
}


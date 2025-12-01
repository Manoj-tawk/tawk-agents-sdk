/**
 * Realtime Agent
 * 
 * Specialized agent class for voice-based interactions
 * 
 * @module agent
 */

import type {
  RealtimeAgentConfig,
  RealtimeContext,
  SessionConfig,
  RealtimeVoice,
} from './types';
import type { CoreTool } from 'tawk-agents-sdk';

/**
 * Realtime Agent for voice interactions
 * 
 * Unlike regular text agents, realtime agents are optimized for voice:
 * - Lower latency responses
 * - Voice-specific tools
 * - Audio streaming
 * - Turn detection
 * 
 * @example
 * ```typescript
 * const agent = new RealtimeAgent({
 *   name: 'VoiceAssistant',
 *   instructions: 'You are a helpful voice assistant',
 *   voice: 'alloy',
 *   tools: [weatherTool, calendarTool],
 * });
 * ```
 */
export class RealtimeAgent<TContext = unknown> {
  /**
   * Agent name
   */
  public readonly name: string;

  /**
   * Agent instructions (system prompt)
   */
  public readonly instructions: string;

  /**
   * Voice to use
   */
  public readonly voice?: RealtimeVoice;

  /**
   * Tools available to the agent
   */
  public readonly tools: CoreTool[];

  /**
   * Other realtime agents to handoff to
   */
  public handoffs: RealtimeAgent<TContext>[];

  /**
   * Handoff description for LLM
   */
  public readonly handoffDescription?: string;

  /**
   * Session configuration
   */
  public readonly sessionConfig?: SessionConfig;

  /**
   * Initial context
   */
  private readonly initialContext?: TContext;

  constructor(config: RealtimeAgentConfig<TContext>) {
    this.name = config.name;
    this.instructions = config.instructions;
    this.voice = config.voice;
    this.tools = config.tools || [];
    this.handoffs = config.handoffs || [];
    this.handoffDescription = config.handoffDescription;
    this.sessionConfig = config.sessionConfig;
    this.initialContext = config.context;

    // Validate configuration
    this.validateConfig();
  }

  /**
   * Validate agent configuration
   */
  private validateConfig(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Realtime agent name is required');
    }

    if (!this.instructions || this.instructions.trim().length === 0) {
      throw new Error('Realtime agent instructions are required');
    }

    // Validate tools
    for (const tool of this.tools) {
      if (!tool.description || !tool.inputSchema) {
        throw new Error(`Tool must have description and inputSchema: ${JSON.stringify(tool)}`);
      }
    }

    // Validate handoffs
    for (const handoff of this.handoffs) {
      if (!(handoff instanceof RealtimeAgent)) {
        throw new Error('Handoffs must be RealtimeAgent instances');
      }
    }
  }

  /**
   * Get agent context
   */
  public getContext(): TContext | undefined {
    return this.initialContext;
  }

  /**
   * Get session configuration with agent defaults
   */
  public getSessionConfig(): SessionConfig {
    return {
      voice: this.voice,
      ...this.sessionConfig,
    };
  }

  /**
   * Convert tool to realtime format
   */
  public getRealtimeTools(): Array<{
    type: 'function';
    name: string;
    description: string;
    parameters: any;
  }> {
    return this.tools.map(tool => ({
      type: 'function' as const,
      name: tool.description.split(' ')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      description: tool.description,
      parameters: tool.inputSchema || {},
    }));
  }

  /**
   * Get handoff tools for voice
   */
  public getHandoffTools(): Array<{
    type: 'function';
    name: string;
    description: string;
    parameters: any;
  }> {
    return this.handoffs.map(agent => ({
      type: 'function' as const,
      name: `handoff_to_${agent.name.toLowerCase().replace(/\s+/g, '_')}`,
      description: agent.handoffDescription || `Handoff to ${agent.name}`,
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for handoff',
          },
        },
        required: ['reason'],
      },
    }));
  }

  /**
   * Get all tools (regular + handoffs)
   */
  public getAllTools(): Array<{
    type: 'function';
    name: string;
    description: string;
    parameters: any;
  }> {
    return [...this.getRealtimeTools(), ...this.getHandoffTools()];
  }

  /**
   * Check if tool call is a handoff
   */
  public isHandoffTool(toolName: string): boolean {
    return toolName.startsWith('handoff_to_');
  }

  /**
   * Get handoff target from tool name
   */
  public getHandoffTarget(toolName: string): RealtimeAgent<TContext> | undefined {
    if (!this.isHandoffTool(toolName)) {
      return undefined;
    }

    const targetName = toolName
      .replace('handoff_to_', '')
      .replace(/_/g, ' ');

    return this.handoffs.find(
      agent => agent.name.toLowerCase() === targetName.toLowerCase()
    );
  }

  /**
   * Clone agent with overrides
   */
  public clone(overrides: Partial<RealtimeAgentConfig<TContext>>): RealtimeAgent<TContext> {
    return new RealtimeAgent({
      name: this.name,
      instructions: this.instructions,
      voice: this.voice,
      tools: this.tools,
      handoffs: this.handoffs,
      handoffDescription: this.handoffDescription,
      sessionConfig: this.sessionConfig,
      context: this.initialContext,
      ...overrides,
    });
  }

  /**
   * Convert to string representation
   */
  public toString(): string {
    return `RealtimeAgent(${this.name}, voice=${this.voice || 'default'}, tools=${this.tools.length}, handoffs=${this.handoffs.length})`;
  }
}

/**
 * Create a realtime agent with type inference
 * 
 * @example
 * ```typescript
 * const agent = createRealtimeAgent({
 *   name: 'Assistant',
 *   instructions: 'Be helpful',
 *   voice: 'alloy',
 * });
 * ```
 */
export function createRealtimeAgent<TContext = unknown>(
  config: RealtimeAgentConfig<TContext>
): RealtimeAgent<TContext> {
  return new RealtimeAgent(config);
}


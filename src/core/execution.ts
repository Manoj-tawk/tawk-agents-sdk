/**
 * Agent Execution Engine
 * 
 * @module core/execution
 * @description
 * Core execution logic for agent-driven autonomous behavior.
 * 
 * **Core Capabilities**:
 * - Parallel tool execution for optimal performance
 * - Agent-controlled decision making
 * - Autonomous state transitions
 * - Multi-agent transfer coordination
 * - Comprehensive error handling
 * 
 * **Architecture**:
 * This module processes each execution step, handling tool calls,
 * agent transfers, and state management. It maintains proper
 * separation of concerns between execution logic and orchestration.
 * 
 * @author Tawk.to
 * @license MIT
 * @version 1.0.0
 */

import type { Agent, CoreTool, RunContextWrapper } from './agent';
import type { 
  ModelMessage, 
  GenerateTextResult, 
  ToolSet, 
  FinishReason,
  TypedToolCall
} from 'ai';
import type { RunState, NextStep, StepResult } from './runstate';
import { SingleStepResult } from './runstate';
import { createContextualSpan } from '../tracing/context';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Tool call extracted from model response
 */
export interface ExtractedToolCall {
  toolName: string;
  args: Record<string, unknown>;
  toolCallId: string;
}

/**
 * Handoff/transfer request extracted from model response
 */
export interface HandoffRequest {
  agentName: string;
  reason: string;
  context?: string;
}

/**
 * Processed model response with categorized actions
 */
export interface ProcessedResponse {
  /** Generated text from the model */
  text: string;
  /** Reason the model stopped generating */
  finishReason: FinishReason;
  /** Regular tool calls (non-transfer) */
  toolCalls: ExtractedToolCall[];
  /** Agent transfer/handoff requests */
  handoffRequests: HandoffRequest[];
  /** Messages to add to conversation history */
  newMessages: ModelMessage[];
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  toolName: string;
  args: any;
  result: any;
  error?: Error;
  duration: number;
  needsApproval?: boolean;
  approved?: boolean;
}

/**
 * Execute all tool calls in parallel (CRITICAL for agentic behavior)
 * 
 * This is the key difference from sequential execution:
 * - All tools run simultaneously using Promise.all
 * - No waiting for one tool to finish before starting another
 * - Agents can make parallel decisions
 * 
 * @param tools - Dictionary of available tools
 * @param toolCalls - Tool calls to execute
 * @param contextWrapper - Execution context
 * @returns Array of tool execution results
 */
export async function executeToolsInParallel<TContext = any>(
  tools: Record<string, CoreTool>,
  toolCalls: Array<{ toolName: string; args: any; toolCallId?: string }>,
  contextWrapper: RunContextWrapper<TContext>
): Promise<ToolExecutionResult[]> {
  if (toolCalls.length === 0) {
    return [];
  }

  // Execute ALL tools in parallel
  const executionPromises = toolCalls.map(async (toolCall) => {
    const tool = tools[toolCall.toolName];
    const startTime = Date.now();

    if (!tool) {
      return {
        toolName: toolCall.toolName,
        args: toolCall.args,
        result: null,
        error: new Error(`Tool ${toolCall.toolName} not found`),
        duration: Date.now() - startTime,
      };
    }

    // Check if tool needs approval
    const enabled = tool.enabled;
    let needsApproval = false;
    
    if (typeof enabled === 'function') {
      const isEnabled = await enabled(contextWrapper);
      needsApproval = !isEnabled;
    } else if (enabled === false) {
      needsApproval = true;
    }

    if (needsApproval) {
      return {
        toolName: toolCall.toolName,
        args: toolCall.args,
        result: null,
        duration: Date.now() - startTime,
        needsApproval: true,
        approved: false,
      };
    }

    // Prepare args for tracing metadata
    let argsKeys: string[];
    if (toolCall.args) {
      argsKeys = Object.keys(toolCall.args);
    } else {
      argsKeys = [];
    }

    // Execute tool with tracing
    const span = createContextualSpan(`Tool: ${toolCall.toolName}`, {
      input: toolCall.args || {},
      metadata: {
        toolName: toolCall.toolName,
        agentName: contextWrapper.agent.name,
        argsReceived: !!toolCall.args,
        argsKeys,
      },
    });

    try {
      // Execute the tool
      const args = toolCall.args || {};
      const result = await tool.execute(args, contextWrapper as any);

      // End span with result
      if (span) {
        let outputString: string;
        if (typeof result === 'string') {
          outputString = result;
        } else {
          outputString = JSON.stringify(result);
        }
        span.end({ output: outputString });
      }

      return {
        toolName: toolCall.toolName,
        args: toolCall.args,
        result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      // End span with error
      if (span) {
        let errorMessage: string;
        if (error instanceof Error) {
          errorMessage = error.message;
        } else {
          errorMessage = String(error);
        }
        span.end({
          output: errorMessage,
          level: 'ERROR',
        });
      }

      // Normalize error to Error instance
      let normalizedError: Error;
      if (error instanceof Error) {
        normalizedError = error;
      } else {
        normalizedError = new Error(String(error));
      }

      return {
        toolName: toolCall.toolName,
        args: toolCall.args,
        result: null,
        error: normalizedError,
        duration: Date.now() - startTime,
      };
    }
  });

  // Wait for ALL tools to complete in parallel
  return await Promise.all(executionPromises);
}

// Transfer tool name prefixes
const TRANSFER_PREFIXES = ['transfer_to_', 'handoff_to_'] as const;

/**
 * Check if a tool name is a transfer/handoff tool
 */
function isTransferTool(toolName: string): boolean {
  return TRANSFER_PREFIXES.some(prefix => toolName.startsWith(prefix));
}

/**
 * Extract target agent name from transfer tool name
 */
function extractTargetAgentName(toolName: string): string {
  for (const prefix of TRANSFER_PREFIXES) {
    if (toolName.startsWith(prefix)) {
      return toolName.slice(prefix.length).replace(/_/g, ' ');
    }
  }
  return toolName;
}

/**
 * Process model response and categorize actions
 * 
 * Separates tool calls, handoff requests, and regular messages
 * for autonomous decision making.
 * 
 * @param response - The result from generateText
 * @returns Processed response with categorized tool calls and messages
 */
export function processModelResponse<T extends ToolSet = ToolSet>(
  response: GenerateTextResult<T, unknown>
): ProcessedResponse {
  const toolCalls: ExtractedToolCall[] = [];
  const handoffRequests: HandoffRequest[] = [];

  const responseToolCalls = response.toolCalls ?? [];
  for (let i = 0; i < responseToolCalls.length; i++) {
    const tc = responseToolCalls[i] as TypedToolCall<T>;
    const toolName = tc.toolName;
    const toolCallId = tc.toolCallId;

    const rawInput = (tc as { input?: unknown }).input;
    let toolArgs: Record<string, unknown>;
    if (rawInput !== undefined && rawInput !== null) {
      toolArgs = rawInput as Record<string, unknown>;
    } else {
      toolArgs = {};
    }

    // Categorize as either a transfer request or a regular tool call
    if (isTransferTool(toolName)) {
      let reason: string;
      if (typeof toolArgs.reason === 'string' && toolArgs.reason) {
        reason = toolArgs.reason;
      } else {
        reason = 'Transfer requested';
      }

      handoffRequests.push({
        agentName: extractTargetAgentName(toolName),
        reason,
        context: toolArgs.context as string | undefined,
      });
    } else {
      toolCalls.push({
        toolName,
        args: toolArgs,
        toolCallId,
      });
    }
  }

  // Build new messages array
  // IMPORTANT: Transform messages to ensure proper ModelMessage format
  // The AI SDK response uses 'input' for tool calls, but generateText expects 'args'
  const newMessages: ModelMessage[] = [];
  if (response.response?.messages && response.response.messages.length > 0) {
    for (const msg of response.response.messages) {
      const message = msg as ModelMessage;
      
      // FIRST: Skip tool messages - we'll add our own with proper format
      // This avoids duplicate tool messages
      if (message.role === 'tool') {
        continue;
      }
      
      // Transform assistant messages with tool-call parts
      if (message.role === 'assistant' && Array.isArray(message.content)) {
        // Transform tool-call parts to ensure proper format for AI SDK
        // IMPORTANT: AI SDK internally uses 'input' property, NOT 'args'
        // See: toolCallPartSchema in ai/dist/index.js uses 'input: z.unknown()'
        const transformedContent = message.content.map((part: any) => {
          if (part.type === 'tool-call') {
            // Get the tool arguments from either 'input' or 'args', defaulting to empty object
            const toolInput = part.input ?? part.args ?? {};
            // Construct with properties matching AI SDK's toolCallPartSchema
            // Only include: type, toolCallId, toolName, input, providerOptions, providerExecuted
            return {
              type: 'tool-call' as const,
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              input: toolInput,  // AI SDK uses 'input', not 'args'
            };
          }
          return part;
        });
        // Explicitly construct new message with ONLY role and content
        const transformedMessage: ModelMessage = {
          role: 'assistant' as const,
          content: transformedContent,
        };
        newMessages.push(transformedMessage);
      } else {
        newMessages.push(message);
      }
    }
  } else if (response.text) {
    newMessages.push({ role: 'assistant' as const, content: response.text });
  }

  return {
    text: response.text,
    finishReason: response.finishReason,
    toolCalls,
    handoffRequests,
    newMessages,
  };
}

/**
 * Determine next step based on agent's decision (NOT SDK decision)
 * 
 * This is critical for true agentic behavior:
 * - Agent decides if it needs to continue
 * - Agent decides if it needs to handoff
 * - Agent decides if it has a final output
 * - Agent decides if it needs human approval
 * 
 * @param agent - Current agent
 * @param processed - Processed response
 * @param toolResults - Tool execution results
 * @param context - Execution context
 * @returns Next step decision
 */
export async function determineNextStep<TContext = any>(
  agent: Agent<TContext, any>,
  processed: ProcessedResponse,
  toolResults: ToolExecutionResult[],
  context: TContext
): Promise<NextStep> {
  // 1. Check for interruptions (tool approvals needed)
  const needsApproval = toolResults.some((r) => r.needsApproval && !r.approved);
  if (needsApproval) {
    const interruptions = toolResults
      .filter((r) => r.needsApproval && !r.approved)
      .map((r) => ({
        toolName: r.toolName,
        args: r.args,
        type: 'tool_approval',
      }));

    return {
      type: 'next_step_interruption',
      interruptions,
    };
  }

  // 2. Check for handoff requests (agent wants to delegate)
  if (processed.handoffRequests.length > 0) {
    const handoff = processed.handoffRequests[0]; // Take first handoff
    const targetAgent = agent.handoffs.find(
      (a) => a.name.toLowerCase().replace(/\s+/g, '_') === handoff.agentName
    );

    if (targetAgent) {
      return {
        type: 'next_step_handoff',
        newAgent: targetAgent,
        reason: handoff.reason,
        context: handoff.context,
      };
    }
  }

  // 3. Check agent's custom shouldFinish function
  if (agent._shouldFinish) {
    const shouldFinish = agent._shouldFinish(
      context,
      toolResults.map((r) => r.result)
    );

    if (shouldFinish && processed.text) {
      return {
        type: 'next_step_final_output',
        output: processed.text,
      };
    }
  }

  // 4. Check if agent has produced final output (no tools, has text)
  const hasToolCalls = processed.toolCalls.length > 0;
  const hasText = !!processed.text;
  const finishedReason = processed.finishReason === 'stop' || processed.finishReason === 'length';

  if (!hasToolCalls && hasText && finishedReason) {
    // Agent has finished - no more tool calls needed
    return {
      type: 'next_step_final_output',
      output: processed.text || '',
    };
  }

  // 5. Continue running - agent needs more turns
  return {
    type: 'next_step_run_again',
  };
}

/**
 * Execute a single agent step with autonomous decision making
 * 
 * @param agent - Current agent
 * @param state - Run state
 * @param contextWrapper - Execution context wrapper
 * @param modelResponse - Response from generateText
 * @returns Single step result with next step decision
 */
export async function executeSingleStep<TContext = any>(
  agent: Agent<TContext, any>,
  state: RunState<TContext, Agent<TContext, any>>,
  contextWrapper: RunContextWrapper<TContext>,
  modelResponse: GenerateTextResult<ToolSet, unknown>
): Promise<SingleStepResult> {
  // 1. Process model response
  const processed = processModelResponse(modelResponse);

  // 2. Execute tools in parallel (CRITICAL)
  const toolResults = await executeToolsInParallel(
    agent._tools,
    processed.toolCalls,
    contextWrapper
  );

  // 3. Update state with tool results
  const preStepMessages = [...state.messages];
  const newMessages = [...processed.newMessages];

  // Add tool results as proper ToolModelMessage objects
  // The AI SDK's response.response.messages contains the assistant's tool call request,
  // but NOT the actual tool results from our custom execution.
  // We must add tool results so the next generateText call knows what happened.
  if (toolResults.length > 0) {
    // Create a Map for O(1) lookup of toolCallIds by toolName
    const toolCallIdMap = new Map<string, string>();
    for (const tc of processed.toolCalls) {
      toolCallIdMap.set(tc.toolName, tc.toolCallId);
    }

    const toolResultParts = [];
    for (const r of toolResults) {
      let toolCallId = toolCallIdMap.get(r.toolName);
      if (!toolCallId) {
        toolCallId = `call_${r.toolName}_${Date.now()}`;
      }

      let output: { type: 'error-text'; value: string } | { type: 'json'; value: unknown };
      if (r.error) {
        output = { type: 'error-text' as const, value: r.error.message };
      } else {
        const resultValue = r.result !== undefined ? r.result : null;
        output = { type: 'json' as const, value: resultValue };
      }

      toolResultParts.push({
        type: 'tool-result' as const,
        toolCallId,
        toolName: r.toolName,
        output,
      });
    }

    // Add as a single tool message with all results
    newMessages.push({
      role: 'tool' as const,
      content: toolResultParts
    } as ModelMessage);
  }

  // Combine messages
  const combinedMessages = [...state.messages, ...newMessages];

  // 4. Record step
  const stepResult: StepResult = {
    stepNumber: state.stepNumber + 1,
    agentName: agent.name,
    toolCalls: toolResults.map((r) => ({
      toolName: r.toolName,
      args: r.args,
      result: r.result,
    })),
    text: processed.text,
    finishReason: processed.finishReason,
    timestamp: Date.now(),
  };

  state.recordStep(stepResult);

  // 5. Update metrics
  if (modelResponse.usage) {
    state.updateAgentMetrics(
      agent.name,
      {
        input: modelResponse.usage.inputTokens || 0,
        output: modelResponse.usage.outputTokens || 0,
        total: modelResponse.usage.totalTokens || 0,
      },
      toolResults.length
    );

    state.usage.inputTokens += modelResponse.usage.inputTokens || 0;
    state.usage.outputTokens += modelResponse.usage.outputTokens || 0;
    state.usage.totalTokens += modelResponse.usage.totalTokens || 0;
  }

  // 6. Track tool usage for this agent
  if (toolResults.length > 0) {
    state.toolUseTracker.addToolUse(
      agent,
      toolResults.map((r) => r.toolName)
    );
  }

  // 7. Let AGENT decide what to do next (not SDK)
  const nextStep = await determineNextStep(
    agent,
    processed,
    toolResults,
    state.context
  );

  return new SingleStepResult(
    state.originalInput,
    combinedMessages,
    preStepMessages,
    newMessages,
    nextStep,
    stepResult
  );
}


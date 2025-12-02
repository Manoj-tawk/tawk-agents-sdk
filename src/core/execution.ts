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
 * @version 2.0.0
 */

import type { Agent, CoreTool, RunContextWrapper } from './agent';
import type { ModelMessage } from 'ai';
import type { RunState, NextStep, StepResult } from './runstate';
import { SingleStepResult } from './runstate';
import { createContextualSpan } from '../tracing/context';

/**
 * Processed model response with categorized actions
 */
export interface ProcessedResponse {
  text?: string;
  finishReason?: string;
  toolCalls: Array<{
    toolName: string;
    args: any;
    toolCallId?: string;
  }>;
  handoffRequests: Array<{
    agentName: string;
    reason: string;
    context?: string;
  }>;
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

    // Execute tool with tracing
    const span = createContextualSpan(`Tool: ${toolCall.toolName}`, {
      input: toolCall.args || {},  // Ensure we have an object, not undefined
      metadata: {
        toolName: toolCall.toolName,
        agentName: contextWrapper.agent.name,
        argsReceived: !!toolCall.args,
        argsKeys: toolCall.args ? Object.keys(toolCall.args) : []
      },
    });

    try {
      // Log for debugging
      // Extract arguments for tool execution
      const result = await tool.execute(toolCall.args || {}, contextWrapper as any);

      if (span) {
        span.end({
          output: typeof result === 'string' ? result : JSON.stringify(result),
        });
      }

      return {
        toolName: toolCall.toolName,
        args: toolCall.args,
        result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      if (span) {
        span.end({
          output: error instanceof Error ? error.message : String(error),
          level: 'ERROR',
        });
      }

      return {
        toolName: toolCall.toolName,
        args: toolCall.args,
        result: null,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      };
    }
  });

  // Wait for ALL tools to complete in parallel
  return await Promise.all(executionPromises);
}

/**
 * Process model response and categorize actions
 * 
 * Separates tool calls, handoff requests, and regular messages
 * for autonomous decision making
 */
export function processModelResponse(
  response: any,
  _currentAgent: Agent<any, any>
): ProcessedResponse {
  const toolCalls: ProcessedResponse['toolCalls'] = [];
  const handoffRequests: ProcessedResponse['handoffRequests'] = [];
  const newMessages: ModelMessage[] = [];

  // Extract tool calls from response
  if (response.toolCalls && Array.isArray(response.toolCalls)) {
    for (const tc of response.toolCalls) {
      const toolName = (tc as any).toolName;
      
      // Extract args - AI SDK might use 'args' or 'input'
      const toolArgs = (tc as any).args || (tc as any).input || {};
      
      // Check if this is a transfer/handoff tool (support both naming conventions)
      if (toolName.startsWith('transfer_to_') || toolName.startsWith('handoff_to_')) {
        const targetAgentName = toolName
          .replace('transfer_to_', '')
          .replace('handoff_to_', '')
          .replace(/_/g, ' ');
        handoffRequests.push({
          agentName: targetAgentName,
          reason: toolArgs?.reason || 'Transfer requested',
          context: toolArgs?.context,
        });
      } else {
        toolCalls.push({
          toolName,
          args: toolArgs,
          toolCallId: (tc as any).toolCallId,
        });
      }
    }
  }

  // Add response messages to history
  if (response.response?.messages) {
    newMessages.push(...response.response.messages);
  } else if (response.text) {
    newMessages.push({
      role: 'assistant',
      content: response.text,
    });
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
 * @param options - Execution options
 * @returns Single step result with next step decision
 */
export async function executeSingleStep<TContext = any>(
  agent: Agent<TContext, any>,
  state: RunState<TContext, Agent<TContext, any>>,
  contextWrapper: RunContextWrapper<TContext>,
  modelResponse: any
): Promise<SingleStepResult> {
  // 1. Process model response
  const processed = processModelResponse(modelResponse, agent);

  // 2. Execute tools in parallel (CRITICAL)
  const toolResults = await executeToolsInParallel(
    agent._tools,
    processed.toolCalls,
    contextWrapper
  );

  // 3. Update state with tool results
  const preStepMessages = [...state.messages];
  const newMessages = [...processed.newMessages];

  // NOTE: Tool results are already included in processed.newMessages from the AI SDK response
  // We don't need to add them again manually

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


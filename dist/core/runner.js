"use strict";
/**
 * Agent Execution Runner
 *
 * @module core/runner
 * @description
 * Production-grade agent execution engine implementing true agentic architecture.
 *
 * **Core Principles**:
 * - Agents drive their own execution lifecycle
 * - Parallel tool execution for optimal performance
 * - Autonomous decision-making (agent-controlled, not SDK-controlled)
 * - State management for interruption and resumption
 * - Seamless multi-agent coordination and transfers
 * - End-to-end observability with Langfuse tracing
 *
 * **Features**:
 * - Streaming support for real-time responses
 * - Input/output guardrails with automatic feedback
 * - Token usage tracking and optimization
 * - Comprehensive error handling
 * - Production-ready reliability
 *
 * @author Tawk.to
 * @license MIT
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgenticRunner = void 0;
exports.run = run;
const ai_1 = require("ai");
const runstate_1 = require("./runstate");
const execution_1 = require("./execution");
const langfuse_1 = require("../lifecycle/langfuse");
const context_1 = require("../tracing/context");
const lifecycle_1 = require("../lifecycle");
/**
 * Runner - Orchestrates agent execution with true agentic patterns
 *
 * Key differences from old implementation:
 * 1. Agents decide when to continue/finish (not SDK)
 * 2. Tools execute in parallel (not sequential)
 * 3. Proper state management for interruption/resumption
 * 4. Agent-driven handoffs with context
 *
 * @template TContext - Type of context object
 * @template TOutput - Type of output
 */
class AgenticRunner extends lifecycle_1.RunHooks {
    constructor(options = {}) {
        super();
        this.options = options;
    }
    /**
     * Execute an agent run with true agentic patterns
     *
     * @param agent - The agent to execute
     * @param input - User input
     * @param options - Run options
     * @returns Run result
     */
    async execute(agent, input, options = {}) {
        const mergedOptions = { ...this.options, ...options };
        const context = mergedOptions.context || {};
        const maxTurns = mergedOptions.maxTurns || 50;
        // Initialize run state
        const state = new runstate_1.RunState(agent, input, context, maxTurns);
        // Auto-initialize Langfuse tracing
        (0, langfuse_1.isLangfuseEnabled)();
        // Get or create trace
        let trace = (0, context_1.getCurrentTrace)();
        if (!trace && (0, langfuse_1.isLangfuseEnabled)()) {
            const initialInput = typeof input === 'string'
                ? input
                : input.find((m) => m.role === 'user')?.content || input;
            trace = (0, langfuse_1.createTrace)({
                name: `Agent Run`,
                input: initialInput,
                metadata: {
                    initialAgent: agent.name,
                    maxTurns,
                },
                tags: ['agent', 'run', 'agentic'],
            });
        }
        state.trace = trace;
        // Run everything within trace context so spans nest properly
        return await (0, context_1.runWithTraceContext)(trace, async () => {
            // Run input guardrails
            await this.runInputGuardrails(agent, state);
            // Emit agent_start event
            const contextWrapper = this.getContextWrapper(agent, state);
            this.emit('agent_start', contextWrapper, agent);
            agent.emit('agent_start', contextWrapper, agent);
            try {
                return await this.executeAgentLoop(agent, state, contextWrapper, maxTurns);
            }
            catch (error) {
                if (state.currentAgentSpan) {
                    state.currentAgentSpan.end({
                        output: { error: String(error) },
                        level: 'ERROR',
                    });
                }
                throw error;
            }
        });
    }
    /**
     * Main agent execution loop
     */
    async executeAgentLoop(agent, state, contextWrapper, maxTurns) {
        try {
            // Main agentic execution loop
            while (!state.isMaxTurnsExceeded()) {
                state.incrementTurn();
                // Create agent span if needed
                // IMPORTANT: Create spans directly from TRACE to maintain sibling hierarchy
                if (!state.currentAgentSpan || state.currentAgentSpan._agentName !== state.currentAgent.name) {
                    if (state.currentAgentSpan) {
                        // End previous agent span with accumulated token usage
                        const prevAgentName = state.currentAgentSpan._agentName;
                        const prevAgentMetrics = prevAgentName ? state.agentMetrics.get(prevAgentName) : null;
                        state.currentAgentSpan.end({
                            usage: prevAgentMetrics ? {
                                input: prevAgentMetrics.tokens.input,
                                output: prevAgentMetrics.tokens.output,
                                total: prevAgentMetrics.tokens.total
                            } : undefined
                        });
                    }
                    // Create span as direct child of trace to maintain proper hierarchy
                    // This makes all agents siblings instead of nested
                    const agentSpan = state.trace?.span({
                        name: `Agent: ${state.currentAgent.name}`,
                        input: { messages: (0, langfuse_1.formatMessagesForLangfuse)(state.messages) },
                        metadata: {
                            agentName: state.currentAgent.name,
                            tools: Object.keys(state.currentAgent._tools || {}),
                            subagents: state.currentAgent.subagents.map((a) => a.name),
                            turn: state.currentTurn,
                        },
                    });
                    state.currentAgentSpan = agentSpan;
                    if (agentSpan) {
                        agentSpan._agentName = state.currentAgent.name;
                        // Update context span for nested generations/tools
                        (0, context_1.setCurrentSpan)(agentSpan);
                    }
                }
                // Get system instructions
                const systemMessage = await state.currentAgent.getInstructions(contextWrapper);
                // Get model
                const model = state.currentAgent._model;
                // Prepare tools
                const tools = state.currentAgent._tools;
                // Create GENERATION (not span) for LLM call - this properly tracks tokens in Langfuse
                const generation = state.currentAgentSpan?.generation({
                    name: `LLM Generation: ${state.currentAgent.name}`,
                    model: (0, langfuse_1.extractModelName)(model),
                    modelParameters: {
                        temperature: state.currentAgent._modelSettings?.temperature,
                        topP: state.currentAgent._modelSettings?.topP,
                        maxTokens: state.currentAgent._modelSettings?.maxTokens,
                    },
                    input: {
                        system: systemMessage.substring(0, 200),
                        messages: state.messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content.substring(0, 100) : '...' })),
                        tools: Object.keys(tools || {})
                    },
                    metadata: {
                        agentName: state.currentAgent.name,
                        turn: state.currentTurn,
                        modelName: (0, langfuse_1.extractModelName)(model),
                        toolCount: Object.keys(tools || {}).length
                    }
                });
                // Call model
                const modelResponse = await (0, ai_1.generateText)({
                    model: model,
                    system: systemMessage,
                    messages: state.messages,
                    tools: tools,
                    temperature: state.currentAgent._modelSettings?.temperature,
                    topP: state.currentAgent._modelSettings?.topP,
                    maxTokens: state.currentAgent._modelSettings?.maxTokens,
                    presencePenalty: state.currentAgent._modelSettings?.presencePenalty,
                    frequencyPenalty: state.currentAgent._modelSettings?.frequencyPenalty,
                });
                // End generation with proper usage tracking
                if (generation) {
                    const usage = modelResponse.usage || {};
                    generation.end({
                        output: {
                            text: modelResponse.text.substring(0, 200),
                            toolCalls: modelResponse.toolCalls?.length || 0,
                            finishReason: modelResponse.finishReason
                        },
                        // Use Langfuse's usage parameter to track tokens properly
                        usage: {
                            input: usage.inputTokens || 0,
                            output: usage.outputTokens || 0,
                            total: usage.totalTokens || 0,
                        },
                        metadata: {
                            finishReason: modelResponse.finishReason,
                        }
                    });
                }
                // Execute single step with AUTONOMOUS decision making
                const stepResult = await (0, execution_1.executeSingleStep)(state.currentAgent, state, contextWrapper, modelResponse);
                // Update state with new messages
                state.messages = stepResult.messages;
                // Handle next step based on AGENT's decision
                const nextStep = stepResult.nextStep;
                if (nextStep.type === runstate_1.NextStepType.FINAL_OUTPUT) {
                    // Agent decided to finish - check guardrails first
                    const guardrailResult = await this.runOutputGuardrails(state.currentAgent, state, nextStep.output);
                    if (!guardrailResult.passed) {
                        // Guardrail failed - add feedback and retry
                        state.messages.push({
                            role: 'system',
                            content: guardrailResult.feedback || 'Please regenerate your response.'
                        });
                        // Continue loop to let agent retry
                        continue;
                    }
                    // Parse output if schema provided
                    let finalOutput;
                    if (state.currentAgent._outputSchema) {
                        try {
                            const parsed = JSON.parse(nextStep.output);
                            finalOutput = state.currentAgent._outputSchema.parse(parsed);
                        }
                        catch {
                            finalOutput = nextStep.output;
                        }
                    }
                    else {
                        finalOutput = nextStep.output;
                    }
                    // IMPORTANT: For user-facing output, always ensure it's a string
                    // If outputSchema returned an object, stringify it
                    const finalOutputString = typeof finalOutput === 'string'
                        ? finalOutput
                        : JSON.stringify(finalOutput, null, 2);
                    // End agent span with accumulated token usage
                    if (state.currentAgentSpan) {
                        const agentMetrics = state.agentMetrics.get(state.currentAgent.name);
                        // Configurable truncation for Langfuse (default: 5000 chars, set to 0 for no truncation)
                        const maxOutputLength = process.env.LANGFUSE_MAX_OUTPUT_LENGTH
                            ? parseInt(process.env.LANGFUSE_MAX_OUTPUT_LENGTH)
                            : 5000;
                        const truncatedOutput = maxOutputLength > 0 && finalOutputString.length > maxOutputLength
                            ? finalOutputString.substring(0, maxOutputLength) + '... (truncated)'
                            : finalOutputString;
                        state.currentAgentSpan.end({
                            output: truncatedOutput,
                            metadata: {
                                fullLength: finalOutputString.length,
                                truncated: finalOutputString.length > maxOutputLength
                            },
                            usage: agentMetrics ? {
                                input: agentMetrics.tokens.input,
                                output: agentMetrics.tokens.output,
                                total: agentMetrics.tokens.total
                            } : undefined
                        });
                    }
                    // Emit agent_end event
                    this.emit('agent_end', contextWrapper, agent, finalOutputString);
                    agent.emit('agent_end', contextWrapper, finalOutputString);
                    // Update trace with final output and aggregated metadata
                    if (state.trace) {
                        state.trace.update({
                            output: finalOutputString, // Just the text, not an object
                            metadata: {
                                agentPath: state.handoffChain.length > 0 ? state.handoffChain : [agent.name],
                                success: true,
                                totalTokens: state.usage.totalTokens,
                                promptTokens: state.usage.inputTokens,
                                completionTokens: state.usage.outputTokens,
                                totalCost: (state.usage.totalTokens || 0) * 0.00000015, // ~$0.15 per 1M tokens
                                duration: state.getDuration(),
                                agentCount: state.agentMetrics.size,
                                totalToolCalls: state.steps.reduce((sum, s) => sum + (s.toolCalls?.length || 0), 0),
                                totalTransfers: state.handoffChain.length,
                                finishReason: stepResult.stepResult?.finishReason,
                            }
                        });
                    }
                    // Flush Langfuse traces before returning
                    await this.flushTraces();
                    // Return final result (always ensure finalOutput is a string)
                    return {
                        finalOutput: finalOutputString,
                        messages: state.messages,
                        steps: state.steps,
                        state,
                        metadata: {
                            totalTokens: state.usage.totalTokens,
                            promptTokens: state.usage.inputTokens,
                            completionTokens: state.usage.outputTokens,
                            finishReason: stepResult.stepResult?.finishReason,
                            totalToolCalls: state.steps.reduce((sum, s) => sum + s.toolCalls.length, 0),
                            handoffChain: state.handoffChain.length > 0 ? state.handoffChain : undefined,
                            agentMetrics: Array.from(state.agentMetrics.values()),
                            duration: state.getDuration(),
                        },
                    };
                }
                else if (nextStep.type === runstate_1.NextStepType.HANDOFF) {
                    // Agent decided to transfer to another agent
                    if (state.currentAgentSpan) {
                        const agentMetrics = state.agentMetrics.get(state.currentAgent.name);
                        state.currentAgentSpan.end({
                            output: {
                                transferTo: nextStep.newAgent.name,
                                transferReason: nextStep.reason,
                            },
                            metadata: {
                                type: 'transfer',
                                isolated: true, // Context isolation enabled
                                // Include usage in metadata for Langfuse visibility
                                usage: agentMetrics ? {
                                    input: agentMetrics.tokens.input,
                                    output: agentMetrics.tokens.output,
                                    total: agentMetrics.tokens.total
                                } : undefined
                            },
                            usage: agentMetrics ? {
                                input: agentMetrics.tokens.input,
                                output: agentMetrics.tokens.output,
                                total: agentMetrics.tokens.total
                            } : undefined
                        });
                        state.currentAgentSpan = undefined;
                    }
                    // Track transfer in chain
                    state.trackHandoff(nextStep.newAgent.name);
                    // Switch to new agent
                    const previousAgent = state.currentAgent;
                    state.currentAgent = nextStep.newAgent;
                    // Emit transfer event
                    this.emit('agent_handoff', contextWrapper, previousAgent, nextStep.newAgent);
                    previousAgent.emit('agent_handoff', contextWrapper, nextStep.newAgent);
                    // CONTEXT ISOLATION: Reset messages to only user query
                    // Extract original user query
                    const originalUserMessage = Array.isArray(state.originalInput)
                        ? state.originalInput.filter((m) => m.role === 'user')
                        : [{ role: 'user', content: state.originalInput }];
                    // Reset messages to just the user query
                    state.messages = [...originalUserMessage];
                    // Add transfer context as system message (optional: remove if too verbose)
                    if (nextStep.reason) {
                        state.messages.push({
                            role: 'system',
                            content: `[Transfer] Transferred to ${nextStep.newAgent.name}. Reason: ${nextStep.reason}${nextStep.context ? `. Context: ${nextStep.context}` : ''}`,
                        });
                    }
                    // Continue loop with new agent (now with isolated context)
                    continue;
                }
                else if (nextStep.type === runstate_1.NextStepType.INTERRUPTION) {
                    // Agent needs human approval
                    state.pendingInterruptions = nextStep.interruptions;
                    // Return with interruption state
                    return {
                        finalOutput: null,
                        messages: state.messages,
                        steps: state.steps,
                        state,
                        metadata: {
                            totalTokens: state.usage.totalTokens,
                            promptTokens: state.usage.inputTokens,
                            completionTokens: state.usage.outputTokens,
                            finishReason: 'interrupted',
                            totalToolCalls: state.steps.reduce((sum, s) => sum + s.toolCalls.length, 0),
                            handoffChain: state.handoffChain,
                            agentMetrics: Array.from(state.agentMetrics.values()),
                            duration: state.getDuration(),
                        },
                    };
                }
                else if (nextStep.type === runstate_1.NextStepType.RUN_AGAIN) {
                    // Agent decided to continue
                    continue;
                }
            }
            // Max turns exceeded
            throw new Error(`Max turns (${maxTurns}) exceeded`);
        }
        catch (error) {
            if (state.currentAgentSpan) {
                state.currentAgentSpan.end({
                    output: { error: String(error) },
                    level: 'ERROR',
                });
            }
            throw error;
        }
    }
    /**
     * Get context wrapper for tool execution
     */
    getContextWrapper(agent, state) {
        return {
            context: state.context,
            agent,
            messages: state.messages,
            usage: state.usage,
        };
    }
    /**
     * Run input guardrails with tracing at TRACE level
     */
    async runInputGuardrails(agent, state) {
        const guardrails = agent._guardrails.filter((g) => g.type === 'input');
        if (guardrails.length === 0)
            return;
        const lastUserMessage = [...state.messages]
            .reverse()
            .find((m) => m.role === 'user');
        if (!lastUserMessage || typeof lastUserMessage.content !== 'string')
            return;
        const contextWrapper = this.getContextWrapper(agent, state);
        // Create parent span for all input guardrails UNDER the agent span
        const guardrailsSpan = state.currentAgentSpan?.span({
            name: 'Input Guardrails',
            metadata: {
                type: 'input',
                guardrailCount: guardrails.length,
                agentName: agent.name
            }
        });
        try {
            for (const guardrail of guardrails) {
                // Create individual guardrail span under guardrailsSpan
                const guardrailSpan = guardrailsSpan?.span({
                    name: `Guardrail: ${guardrail.name}`,
                    input: {
                        content: lastUserMessage.content.substring(0, 200),
                        type: 'input'
                    },
                    metadata: {
                        guardrailName: guardrail.name,
                        guardrailType: 'input',
                        agentName: agent.name
                    }
                });
                try {
                    const result = await guardrail.validate(lastUserMessage.content, contextWrapper);
                    if (guardrailSpan) {
                        guardrailSpan.end({
                            output: {
                                passed: result.passed,
                                message: result.message
                            },
                            level: result.passed ? 'DEFAULT' : 'WARNING'
                        });
                    }
                    if (!result.passed) {
                        if (guardrailsSpan)
                            guardrailsSpan.end({ level: 'ERROR' });
                        throw new Error(`Input guardrail "${guardrail.name}" failed: ${result.message}`);
                    }
                }
                catch (error) {
                    if (guardrailSpan) {
                        guardrailSpan.end({
                            output: { error: String(error) },
                            level: 'ERROR'
                        });
                    }
                    throw error;
                }
            }
            // Close parent guardrails span
            if (guardrailsSpan) {
                guardrailsSpan.end({
                    output: { allPassed: true },
                    metadata: { totalChecks: guardrails.length }
                });
            }
        }
        catch (error) {
            if (guardrailsSpan)
                guardrailsSpan.end({ level: 'ERROR' });
            throw error;
        }
    }
    /**
     * Run output guardrails with retry mechanism and tracing at TRACE level
     * Returns specific, actionable feedback when validation fails
     */
    async runOutputGuardrails(agent, state, output) {
        const guardrails = agent._guardrails.filter((g) => g.type === 'output');
        if (guardrails.length === 0)
            return { passed: true };
        const contextWrapper = this.getContextWrapper(agent, state);
        // Create parent span for all output guardrails UNDER the agent span
        const guardrailsSpan = state.currentAgentSpan?.span({
            name: 'Output Guardrails',
            metadata: {
                type: 'output',
                guardrailCount: guardrails.length,
                agentName: agent.name,
                outputLength: output.length
            }
        });
        for (const guardrail of guardrails) {
            // Create individual guardrail span under guardrailsSpan
            const guardrailSpan = guardrailsSpan?.span({
                name: `Guardrail: ${guardrail.name}`,
                input: {
                    content: output.substring(0, 200),
                    type: 'output',
                    fullLength: output.length
                },
                metadata: {
                    guardrailName: guardrail.name,
                    guardrailType: 'output',
                    agentName: agent.name
                }
            });
            try {
                const result = await guardrail.validate(output, contextWrapper);
                if (guardrailSpan) {
                    guardrailSpan.end({
                        output: {
                            passed: result.passed,
                            message: result.message,
                            willRetry: !result.passed
                        },
                        level: result.passed ? 'DEFAULT' : 'WARNING'
                    });
                }
                if (!result.passed) {
                    // Generate ACTIONABLE feedback based on guardrail type
                    let actionableFeedback = result.message || 'Validation failed';
                    // Make feedback specific and actionable
                    if (guardrail.name === 'length_check' || result.message?.includes('too long')) {
                        // Extract max length from message if possible
                        const maxMatch = result.message?.match(/max[:\s]+(\d+)/i);
                        const maxLength = maxMatch ? parseInt(maxMatch[1]) : 1500;
                        const currentLength = output.length;
                        const reduction = Math.round(((currentLength - maxLength) / currentLength) * 100);
                        actionableFeedback = `Your response is too long (${currentLength} characters, max: ${maxLength}). Please CONDENSE your existing response to be ${reduction}% shorter. Keep all key points but make it more concise. DO NOT fetch more data - just summarize what you already have.`;
                    }
                    else if (guardrail.name === 'pii_check' || result.message?.includes('PII')) {
                        actionableFeedback = `Your response contains personally identifiable information (PII). Please rewrite your response without including any personal data, email addresses, phone numbers, or sensitive information.`;
                    }
                    else if (result.message?.includes('profanity') || result.message?.includes('inappropriate')) {
                        actionableFeedback = `Your response contains inappropriate content. Please rewrite your response using professional and appropriate language.`;
                    }
                    else if (result.message?.includes('format')) {
                        actionableFeedback = `Your response format is invalid. ${result.message}. Please reformat your response to match the required structure.`;
                    }
                    else {
                        // Generic actionable feedback
                        actionableFeedback = `Your response failed validation: ${result.message}. Please revise your response to address this issue without fetching additional data.`;
                    }
                    if (guardrailsSpan) {
                        guardrailsSpan.end({
                            output: {
                                someFailed: true,
                                feedback: actionableFeedback
                            },
                            level: 'WARNING'
                        });
                    }
                    return {
                        passed: false,
                        feedback: actionableFeedback
                    };
                }
                if (guardrailSpan)
                    guardrailSpan.end();
            }
            catch (error) {
                if (guardrailSpan) {
                    guardrailSpan.end({
                        output: { error: String(error) },
                        level: 'ERROR'
                    });
                }
                // Return error as feedback
                if (guardrailsSpan)
                    guardrailsSpan.end({ level: 'ERROR' });
                return {
                    passed: false,
                    feedback: `Guardrail check failed: ${String(error)}. Please regenerate your response.`
                };
            }
        }
        // Close parent guardrails span
        if (guardrailsSpan) {
            guardrailsSpan.end({
                output: { allPassed: true },
                metadata: { totalChecks: guardrails.length }
            });
        }
        return { passed: true };
    }
    /**
     * Flush Langfuse traces to ensure they're sent
     */
    async flushTraces() {
        if (!(0, langfuse_1.isLangfuseEnabled)())
            return;
        try {
            const langfuse = (0, langfuse_1.getLangfuse)();
            if (langfuse) {
                await langfuse.flushAsync();
            }
        }
        catch (_error) {
            // Silently fail - tracing errors should not break execution
        }
    }
}
exports.AgenticRunner = AgenticRunner;
/**
 * Run an agent with true agentic patterns
 *
 * @param agent - Agent to execute
 * @param input - User input
 * @param options - Run options
 * @returns Run result
 */
async function run(agent, input, options = {}) {
    const runner = new AgenticRunner(options);
    return await runner.execute(agent, input, options);
}
//# sourceMappingURL=runner.js.map
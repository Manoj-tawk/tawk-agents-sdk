/**
 * Agent Module - Main Exports
 *
 * @module core/agent
 * @description
 * Barrel export file that provides the complete Agent API.
 * Maintains 100% backward compatibility with the original agent.ts file.
 *
 * **Exported Components**:
 * - Agent class and utilities
 * - Type definitions
 * - Tool creation function
 * - Model management functions
 *
 * @author Tawk.to
 * @license MIT
 * @version 1.0.0
 */
export type { CoreTool, AgentConfig, RunOptions, RunResult, StreamResult, StreamChunk, StepResult, AgentMetric, RunState, RunContextWrapper, Session, Guardrail, GuardrailResult, } from './types';
export { Agent, setDefaultModel, getDefaultModel, } from './agent-class';
export { tool } from './tools';
export { run, runStream } from './run';
export * from './types';
export * from './agent-class';
export * from './tools';
export * from './run';
//# sourceMappingURL=index.d.ts.map
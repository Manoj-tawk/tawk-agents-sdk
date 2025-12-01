# Multi-Agent Orchestration Gaps Analysis

This document outlines the gaps identified in the `tawk-agents-sdk` specifically regarding its ability to handle multiple agents and orchestration, distinct from the general AI SDK feature parity gaps.

## 1. Handoff Mechanism Regression (Context Filtering)

**Status**: 🔴 Critical Gap

The `Handoff` class in `src/handoffs/index.ts` supports `inputFilter` (e.g., `removeAllTools`, `keepLastMessages`), allowing developers to sanitize or reduce the context passed to the next agent. However, this class is marked as **DEPRECATED** in `src/index.ts`.

The current "transfers" mechanism implemented in `src/core/agent.ts` (via `_setupHandoffTools` and `detectHandoff`) **completely ignores** these filters. It simply switches the active agent and continues the execution loop with the **entire** conversation history.

**Impact**:
- **Token Waste**: Specialized agents receive the full history of the previous generalist agent, including irrelevant tool calls and reasoning.
- **Hallucination Risk**: Specialized agents might get confused by previous context that is irrelevant to their specific task.
- **Privacy/Security**: No way to "redact" sensitive information from the history before handing off to a less privileged agent.

**Recommendation**:
- Re-introduce `inputFilter` support into the `AgentConfig` or the `handoffs` definition.
- Allow `handoffs` to be defined as objects `{ agent: Agent, filter?: HandoffInputFilter }` instead of just `Agent[]`.
- Update `Runner.execute` to apply these filters when a handoff occurs.

## 2. Lack of Supervisor / Orchestrator Pattern

**Status**: 🟠 Major Gap

The SDK currently relies on "handoffs" (A -> B -> C) or "agent as tool" (A calls B as a function). There is no built-in **Supervisor** or **Manager** pattern where a central agent orchestrates a team of workers without handing off control permanently.

**Impact**:
- **Complex Wiring**: Users must manually define handoff paths between all agents (mesh network), which scales poorly.
- **Loss of Control**: Once Agent A hands off to Agent B, Agent A loses control. It cannot "supervise" Agent B's work and intervene if Agent B fails.

**Recommendation**:
- Implement a `SupervisorAgent` class that takes a list of agents.
- The Supervisor should automatically register these agents as tools (using `asTool`).
- The Supervisor should have a specialized system prompt to manage the team.
- The Supervisor should remain the "active" agent, delegating tasks and synthesizing results.

## 3. Linear Control Flow (No "Chat" Between Agents)

**Status**: 🟡 Moderate Gap

The current handoff model is linear: Agent A becomes Agent B. There is no mechanism for Agent A to "chat" with Agent B (send a message and wait for a response) other than treating Agent B as a tool (black box).

**Impact**:
- **Collaboration Limits**: Agents cannot collaborate in a conversational manner (e.g., "What do you think about this?").
- **State Loss**: When Agent A hands off to Agent B, Agent A's internal state (if any, beyond history) is effectively shelved until (and if) control returns.

**Recommendation**:
- Enhance `asTool` to support a more conversational interface, or introduce a `chatWithAgent` tool that allows preserving the caller's context while querying another agent.

## 4. Infinite Loop Prevention

**Status**: 🟡 Moderate Gap

The `Runner` tracks the `handoffChain` for metadata purposes, but it does not seem to actively prevent infinite loops (e.g., Agent A -> Agent B -> Agent A -> Agent B...) other than hitting the global `maxTurns` limit.

**Impact**:
- **Wasted Cost**: Infinite loops will burn through tokens until `maxTurns` is reached.
- **Poor UX**: The user waits until the timeout/maxTurns is hit.

**Recommendation**:
- Implement a `maxHandoffs` limit or a loop detection mechanism (e.g., detect A->B->A pattern and stop or force a supervisor intervention).

## 5. State Isolation

**Status**: 🟡 Moderate Gap

When handing off, the `context` object (dependency injection) is shared across all agents in the run. While often desired, there is no easy way to provide **isolated** or **scoped** context to a specific agent in the chain.

**Impact**:
- **Security**: All agents have access to the full global context (e.g., database connections, user IDs).
- **Testing**: Harder to test agents in isolation if they rely on a shared global context state.

**Recommendation**:
- Allow `handoffs` to define a `contextMapper` or `contextProvider` to transform/scope the context for the target agent.

## 6. Race Agents Integration

**Status**: 🟢 Minor Gap

`raceAgents` exists in `src/core/race-agents.ts` and is exported, but it is not integrated into the `Agent` class itself (e.g., `agent.race([a, b, c])`). It is a standalone function.

**Impact**:
- **Discoverability**: Users might miss this feature if they only look at the `Agent` class API.

**Recommendation**:
- Consider adding a static method `Agent.race(...)` or a helper on the agent instance.

## Summary

To make this a "perfect" agentic SDK, the **Handoff Mechanism** needs a significant upgrade to support filtering and context management (fixing the regression from the deprecated class). Additionally, high-level patterns like **Supervisor** should be first-class citizens to simplify multi-agent orchestration.

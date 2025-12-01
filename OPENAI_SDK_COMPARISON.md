# OpenAI Agents SDK vs Tawk Agents SDK: Gap Analysis & Roadmap

This document analyzes the `openai-agents-js` repository and compares it with the current `tawk-agents-sdk`. It identifies key capabilities to port and optimizations to implement.

## Executive Summary

`openai-agents-js` provides a more mature and structured approach to agent orchestration, particularly in **handoffs**, **tracing**, and **tool definitions**. While `tawk-agents-sdk` leverages the Vercel AI SDK for broad provider support, it lacks the fine-grained control and observability found in OpenAI's implementation.

## Critical Gaps & Solutions

### 1. Advanced Handoff Mechanism

**Current State (Tawk)**:
- Handoffs are simple tool calls returning a `__handoff` marker.
- No ability to filter conversation history before passing to the next agent.
- No hooks for side effects (`onHandoff`).
- No dynamic enabling/disabling of handoffs.

**Target State (OpenAI)**:
- `Handoff` class with:
    - `inputFilter`: Modify history/context before transfer.
    - `onHandoff`: Callback for logging or side effects.
    - `isEnabled`: Predicate to conditionally expose handoffs.
    - `inputType`: Zod schema for passing structured context during handoff.

**Solution**:
- Port the `Handoff` class structure to `tawk-agents-sdk`.
- Update `Runner.detectHandoff` and `Runner.execute` to respect input filters and hooks.
- Replace `_setupHandoffTools` with a more robust registration system.

### 2. Granular Tracing

**Current State (Tawk)**:
- Traces `Agent` runs and `Generations`.
- **Fixed**: Tool execution tracing was missing but has been added (Step 151).
- Still lacks specific span types for Handoffs, Guardrails, and System events.

**Target State (OpenAI)**:
- Dedicated span types: `AgentSpan`, `FunctionSpan`, `HandoffSpan`, `GuardrailSpan`.
- Rich metadata for each span type.

**Solution**:
- Expand `src/tracing` to include specialized span factories.
- Instrument `Runner` to create `HandoffSpan` during transfers.
- Instrument `Guardrail` execution with `GuardrailSpan`.

### 3. Strongly Typed Tool Definitions

**Current State (Tawk)**:
- Uses generic `CoreTool` type (compatible with Vercel AI SDK).
- Loose typing for tool inputs/outputs.

**Target State (OpenAI)**:
- Discriminated union `Tool` type: `FunctionTool | ComputerTool | ShellTool | HostedTool`.
- `StrictToolOptions` vs `NonStrictToolOptions`.
- Built-in support for "Computer Use" and "Hosted MCP Tools".

**Solution**:
- Adopt a stricter `Tool` type definition.
- Add first-class support for MCP tools (Model Context Protocol).
- Implement `ComputerTool` interface for future agentic capabilities.

### 4. Execution Loop & Interruptions

**Current State (Tawk)**:
- `Runner.execute` loop handles basic turns.
- "Interruptions" (e.g., for approval) are not explicitly modeled as a state.

**Target State (OpenAI)**:
- Explicit `NextStep` types: `handoff`, `final_output`, `run_again`, `interruption`.
- `resolveInterruptedTurn` logic for Human-in-the-Loop (HITL) flows.

**Solution**:
- Refactor `Runner` to return explicit `StepResult` types that include interruptions.
- Implement a `resolveInterruption` method to resume execution after user approval.

## Optimization Opportunities (Vercel AI SDK Integration)

Since `tawk-agents-sdk` is built on Vercel AI SDK, we can optimize the ported features:

1.  **Streamlined Tool Calling**: Use Vercel's `tool` helper to define tools with Zod schemas, but wrap them in our new `Tool` interface for added metadata (approval, enabled logic).
2.  **Provider Agnostic Handoffs**: The current "context injection" via system prompt is good. We can enhance it by using Vercel's `experimental_toolCall` features if available, or stick to the robust prompt injection method.
3.  **Unified Tracing**: Ensure all new spans (Handoff, Guardrail) integrate seamlessly with the existing Langfuse setup.

## Roadmap

1.  **Phase 1: Tracing & Observability (In Progress)**
    - [x] Fix missing tool execution traces.
    - [ ] Add `HandoffSpan` and `GuardrailSpan`.

2.  **Phase 2: Handoff Architecture**
    - [ ] Implement `Handoff` class.
    - [ ] Update `Agent` to accept `Handoff` objects.
    - [ ] Update `Runner` to process `Handoff` logic (filters, hooks).

3.  **Phase 3: Tooling & MCP**
    - [ ] Define strict `Tool` types.
    - [ ] Add MCP tool support.
    - [ ] Add "Computer Use" tool interfaces.

4.  **Phase 4: HITL & Interruptions**
    - [ ] Refactor `Runner` loop for explicit interruption states.
    - [ ] Add `needsApproval` logic to tools.

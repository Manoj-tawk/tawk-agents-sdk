# 🏗️ Architecture Guide

**Deep dive into Tawk Agents SDK architecture**

This guide provides a comprehensive technical overview of the SDK's internal architecture, design decisions, and implementation details.

---

## 📖 Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Core Components](#core-components)
3. [Execution Engine](#execution-engine)
4. [State Management](#state-management)
5. [Tool System](#tool-system)
6. [Multi-Agent Coordination](#multi-agent-coordination)
7. [Integration Points](#integration-points)
8. [Data Flow](#data-flow)

---

## 1. High-Level Architecture

### System Overview

```mermaid
graph TB
    subgraph "Application Layer"
        App[Your Application]
        AppCode[Application Code]
    end
    
    subgraph "SDK Core"
        Agent[Agent Core]
        Exec[Execution Engine]
        State[State Manager]
        Tools[Tool System]
        Guard[Guardrail System]
        Trace[Tracing System]
        Session[Session Manager]
    end
    
    subgraph "AI Providers Layer"
        direction LR
        OpenAI[OpenAI]
        Anthropic[Anthropic]
        Google[Google AI]
        Groq[Groq]
    end
    
    subgraph "Integration Layer"
        Langfuse[Langfuse<br/>Tracing]
        Redis[Redis<br/>Sessions]
        MongoDB[MongoDB<br/>Sessions]
        MCP[MCP Servers<br/>Tools]
    end
    
    App --> Agent
    AppCode --> Tools
    
    Agent --> Exec
    Exec --> State
    Exec --> Tools
    Exec --> Guard
    Exec --> Trace
    Exec --> Session
    
    Agent -.->|AI Calls| OpenAI
    Agent -.->|AI Calls| Anthropic
    Agent -.->|AI Calls| Google
    Agent -.->|AI Calls| Groq
    
    Trace -.->|Telemetry| Langfuse
    Session -.->|State| Redis
    Session -.->|State| MongoDB
    Tools -.->|External Tools| MCP
    
    style Agent fill:#4a90e2,stroke:#2c5aa0,stroke-width:3px
    style Exec fill:#e74c3c
    style State fill:#f39c12
    style Tools fill:#27ae60
```

### Design Principles

1. **Provider Agnostic**: Works with any AI provider via Vercel AI SDK
2. **Modular**: Each component is independent and replaceable
3. **Observable**: Built-in tracing at every level
4. **Stateful**: Proper state management for complex workflows
5. **Parallel**: Automatic parallelization of independent operations
6. **Safe**: Multiple layers of validation and control

---

## 2. Core Components

### Component Diagram

```mermaid
graph TB
    subgraph "Agent Layer"
        AgentClass[Agent Class]
        AgentConfig[AgentConfig]
        AgentHooks[Lifecycle Hooks]
    end
    
    subgraph "Execution Layer"
        Runner[AgenticRunner]
        Executor[executeSingleStep]
        ParallelExec[executeToolsInParallel]
        NextStep[determineNextStep]
    end
    
    subgraph "State Layer"
        RunState[RunState]
        RunResult[RunResult]
        StepResult[StepResult]
        AgentMetric[AgentMetrics]
    end
    
    subgraph "Tool Layer"
        CoreTool[CoreTool]
        ToolExec[Tool Execution]
        ToolContext[Tool Context]
        MCPTools[MCP Integration]
    end
    
    subgraph "Safety Layer"
        Guardrails[Guardrails]
        Approvals[Approval Manager]
        Validation[Validators]
    end
    
    AgentClass --> Runner
    AgentClass --> AgentHooks
    Runner --> Executor
    Executor --> ParallelExec
    Executor --> NextStep
    Executor --> RunState
    
    ParallelExec --> CoreTool
    CoreTool --> ToolExec
    ToolExec --> ToolContext
    CoreTool --> MCPTools
    
    Runner --> Guardrails
    ToolExec --> Approvals
    Guardrails --> Validation
    
    RunState --> RunResult
    RunState --> StepResult
    RunState --> AgentMetric
    
    style AgentClass fill:#4a90e2
    style Runner fill:#e74c3c
    style RunState fill:#f39c12
    style CoreTool fill:#27ae60
    style Guardrails fill:#9b59b6
```

### Module Structure

```
src/
├── core/
│   ├── agent.ts              # Agent class & configuration
│   ├── execution.ts          # Parallel tool execution engine
│   ├── runner.ts             # Agentic execution runner
│   ├── runstate.ts           # State management
│   ├── result.ts             # Result types
│   ├── coordination.ts       # Multi-agent coordination
│   ├── race-agents.ts        # Parallel agent execution
│   ├── hitl.ts               # Human-in-the-loop patterns
│   └── approvals.ts          # Approval management
│
├── tools/
│   ├── image.ts              # Image generation
│   ├── audio.ts              # Audio transcription/TTS
│   ├── embedding.ts          # Embeddings
│   └── reranking.ts          # Document reranking
│
├── sessions/
│   ├── memory.ts             # In-memory sessions
│   ├── redis.ts              # Redis sessions
│   ├── database.ts           # MongoDB sessions
│   └── hybrid.ts             # Redis + MongoDB
│
├── guardrails/
│   └── index.ts              # All guardrail implementations
│
├── mcp/
│   ├── index.ts              # Standard MCP integration
│   ├── enhanced.ts           # Enhanced MCP with lifecycle
│   └── utils.ts              # MCP utilities
│
├── tracing/
│   ├── context.ts            # Tracing context management
│   ├── tracing.ts            # Custom tracing
│   └── tracing-utils.ts      # Tracing helpers
│
└── lifecycle/
    ├── events.ts             # Event types
    ├── langfuse/             # Langfuse integration
    └── index.ts              # Lifecycle hooks
```

---

## 3. Execution Engine

### Agentic Execution Flow

```mermaid
flowchart TD
    Start([run agent, input]) --> Init[Initialize RunState]
    Init --> CreateContext[Create Context Wrapper]
    CreateContext --> InitTrace[Initialize Trace]
    
    InitTrace --> Loop{Turn < Max?}
    Loop -->|No| MaxTurns[Throw MaxTurnsError]
    Loop -->|Yes| IncrementTurn[Increment Turn]
    
    IncrementTurn --> CreateSpan[Create Agent Span]
    CreateSpan --> GetInstructions[Get Instructions]
    GetInstructions --> InputGuard{Input<br/>Guardrails?}
    
    InputGuard -->|Fail| GuardFail[Throw GuardrailError]
    InputGuard -->|Pass| CallModel[Call AI Model]
    
    CallModel --> ProcessResponse[Process Response]
    ProcessResponse --> ToolsNeeded{Tools<br/>Needed?}
    
    ToolsNeeded -->|Yes| ExecTools[Execute Tools<br/>in Parallel]
    ToolsNeeded -->|No| CheckHandoff
    
    ExecTools --> CheckApproval{Needs<br/>Approval?}
    CheckApproval -->|Yes| ReturnInterrupted[Return with<br/>Interrupted State]
    CheckApproval -->|No| UpdateMessages[Update Messages]
    UpdateMessages --> RecordStep[Record Step]
    RecordStep --> CheckHandoff{Handoff<br/>Requested?}
    
    CheckHandoff -->|Yes| SwitchAgent[Switch to<br/>New Agent]
    SwitchAgent --> Loop
    CheckHandoff -->|No| ShouldFinish{Should<br/>Finish?}
    
    ShouldFinish -->|No| Loop
    ShouldFinish -->|Yes| OutputGuard{Output<br/>Guardrails?}
    
    OutputGuard -->|Fail| GuardFail
    OutputGuard -->|Pass| ParseOutput[Parse Output Schema]
    ParseOutput --> EndSpan[End Agent Span]
    EndSpan --> UpdateTrace[Update Root Trace]
    UpdateTrace --> Return([Return RunResult])
    
    MaxTurns --> Return
    GuardFail --> Return
    ReturnInterrupted --> Return
    
    style Start fill:#50c878
    style Return fill:#50c878
    style ExecTools fill:#f39c12
    style CallModel fill:#4a90e2
    style GuardFail fill:#e74c3c
    style MaxTurns fill:#e74c3c
```

### Parallel Tool Execution

```mermaid
sequenceDiagram
    participant Runner
    participant ToolEngine
    participant Approval
    participant Tool1
    participant Tool2
    participant Tool3
    participant Trace
    
    Runner->>ToolEngine: executeToolsInParallel(tools)
    
    par Parallel Execution
        ToolEngine->>Approval: Check if Tool1 needs approval
        Approval-->>ToolEngine: Approved
        ToolEngine->>Trace: Create span for Tool1
        ToolEngine->>Tool1: Execute
        Tool1-->>ToolEngine: Result 1
        ToolEngine->>Trace: End span (success)
        
        ToolEngine->>Approval: Check if Tool2 needs approval
        Approval-->>ToolEngine: Needs approval
        ToolEngine-->>ToolEngine: Mark as pending
        
        ToolEngine->>Approval: Check if Tool3 needs approval
        Approval-->>ToolEngine: Approved
        ToolEngine->>Trace: Create span for Tool3
        ToolEngine->>Tool3: Execute
        Tool3-->>ToolEngine: Result 3
        ToolEngine->>Trace: End span (success)
    end
    
    ToolEngine-->>Runner: Results array
    
    Note over Runner: Tool1: Success<br/>Tool2: Needs approval<br/>Tool3: Success
```

### Decision Making (determineNextStep)

```mermaid
graph TB
    Start[Processed Response] --> HasToolCalls{Has Tool<br/>Calls?}
    
    HasToolCalls -->|Yes| ToolsSuccess{All Tools<br/>Succeeded?}
    HasToolCalls -->|No| HasHandoff
    
    ToolsSuccess -->|Yes| Continue[NextStep:<br/>Continue]
    ToolsSuccess -->|No| ApprovalNeeded{Needs<br/>Approval?}
    
    ApprovalNeeded -->|Yes| Interrupt[NextStep:<br/>Interrupt]
    ApprovalNeeded -->|No| ToolError[NextStep:<br/>ToolError]
    
    HasToolCalls -->|No| HasHandoff{Has Handoff<br/>Request?}
    HasHandoff -->|Yes| Handoff[NextStep:<br/>Handoff]
    HasHandoff -->|No| Final[NextStep:<br/>Final]
    
    Continue --> Return([Return NextStep])
    Interrupt --> Return
    ToolError --> Return
    Handoff --> Return
    Final --> Return
    
    style Continue fill:#27ae60
    style Interrupt fill:#f39c12
    style ToolError fill:#e74c3c
    style Handoff fill:#4a90e2
    style Final fill:#50c878
```

---

## 4. State Management

### RunState Architecture

```mermaid
classDiagram
    class RunState {
        +string originalInput
        +Agent currentAgent
        +ModelMessage[] messages
        +number stepNumber
        +number currentTurn
        +number maxTurns
        +any trace
        
        +recordStep(StepResult)
        +incrementTurn()
        +isMaxTurnsExceeded() boolean
        +hasInterruptions() boolean
    }
    
    class StepResult {
        +number stepNumber
        +string agentName
        +ToolCall[] toolCalls
        +string text
        +string finishReason
        +number timestamp
    }
    
    class AgentMetric {
        +string agentName
        +number steps
        +number toolCalls
        +number handoffs
        +TokenUsage tokens
    }
    
    class RunResult {
        +Output finalOutput
        +CoreMessage[] messages
        +StepResult[] steps
        +Metadata metadata
        +RunState state
    }
    
    RunState --> StepResult : tracks
    RunState --> AgentMetric : collects
    RunState --> RunResult : produces
```

### State Transitions

```mermaid
stateDiagram-v2
    [*] --> Initializing: run(agent, input)
    
    Initializing --> Running: State created
    
    Running --> ToolExecution: Tools needed
    ToolExecution --> Running: Tools complete
    
    Running --> ApprovalRequired: Approval needed
    ApprovalRequired --> Interrupted: Save state
    Interrupted --> [*]: Return to caller
    
    [*] --> Running: Resume with state
    
    Running --> HandoffInitiated: Handoff requested
    HandoffInitiated --> Running: New agent active
    
    Running --> OutputValidation: Should finish
    OutputValidation --> Complete: Guardrails pass
    OutputValidation --> Failed: Guardrails fail
    
    Running --> Failed: Max turns exceeded
    Running --> Failed: Tool error
    
    Complete --> [*]: Return result
    Failed --> [*]: Throw error
    
    note right of Interrupted
        State saved externally
        Can be resumed later
    end note
    
    note right of HandoffInitiated
        Agent switches
        Context preserved
    end note
```

---

## 5. Tool System

### Tool Architecture

```mermaid
graph TB
    subgraph "Tool Definition"
        ToolDef[Tool Definition]
        Schema[Input Schema<br/>Zod]
        Execute[Execute Function]
        Enabled[Enabled Logic]
        Approval[Approval Logic]
    end
    
    subgraph "Tool Execution Context"
        Context[RunContextWrapper]
        AgentRef[Agent Reference]
        UserContext[User Context]
        Messages[Message History]
    end
    
    subgraph "Tool Execution"
        Validate[Validate Input]
        CheckEnabled[Check Enabled]
        CheckApproval[Check Approval]
        CreateSpan[Create Trace Span]
        Run[Execute Tool]
        EndSpan[End Span]
    end
    
    ToolDef --> Validate
    Schema --> Validate
    Validate --> CheckEnabled
    Enabled --> CheckEnabled
    CheckEnabled --> CheckApproval
    Approval --> CheckApproval
    CheckApproval --> CreateSpan
    CreateSpan --> Run
    Execute --> Run
    Context --> Run
    Run --> EndSpan
    
    style ToolDef fill:#4a90e2
    style Execute fill:#27ae60
    style Context fill:#f39c12
    style Run fill:#e74c3c
```

### MCP Integration

```mermaid
sequenceDiagram
    participant Agent
    participant MCPManager
    participant MCPServer
    participant Tool
    
    Note over Agent: Agent initialized with<br/>mcpServers config
    
    Agent->>MCPManager: Initialize with configs
    MCPManager->>MCPServer: Connect to server
    MCPServer-->>MCPManager: Connected
    
    MCPManager->>MCPServer: List tools
    MCPServer-->>MCPManager: Tool definitions
    
    MCPManager->>MCPManager: Convert to CoreTools
    MCPManager-->>Agent: Tools ready
    
    Note over Agent: Agent execution starts
    
    Agent->>Tool: Execute MCP tool
    Tool->>MCPServer: Call tool on server
    MCPServer-->>Tool: Result
    Tool-->>Agent: Tool result
    
    Note over Agent: Agent execution complete
    
    Agent->>MCPManager: Cleanup
    MCPManager->>MCPServer: Disconnect
    MCPServer-->>MCPManager: Disconnected
```

---

## 6. Multi-Agent Coordination

### Handoff Mechanism

```mermaid
sequenceDiagram
    participant User
    participant RunnerA as Runner<br/>(Agent A)
    participant AgentA
    participant AgentB
    participant State
    
    User->>RunnerA: run(AgentA, input)
    RunnerA->>State: Create RunState<br/>(agent: AgentA)
    
    loop Execution Loop
        RunnerA->>AgentA: Execute turn
        AgentA-->>RunnerA: Response
        
        alt Handoff Requested
            RunnerA->>State: Record handoff
            RunnerA->>State: Update handoff chain
            RunnerA->>RunnerA: Switch to AgentB
            
            Note over RunnerA: currentAgent = AgentB
            
            RunnerA->>AgentB: Continue execution
            AgentB-->>RunnerA: Response
        else No Handoff
            RunnerA->>State: Record step
        end
    end
    
    RunnerA-->>User: Final result
```

### Race Agents Pattern

```mermaid
graph TB
    Input[User Input]
    
    subgraph "Parallel Agent Execution"
        Agent1[Fast Agent<br/>gpt-4o-mini]
        Agent2[Smart Agent<br/>gpt-4o]
        Agent3[Cheap Agent<br/>llama-3-70b]
    end
    
    Race{Race<br/>First to finish}
    
    Input --> Agent1
    Input --> Agent2
    Input --> Agent3
    
    Agent1 -.->|Result 1| Race
    Agent2 -.->|Result 2| Race
    Agent3 -.->|Result 3| Race
    
    Race -->|Winner| Output[Final Output]
    Race -.->|Cancel| Agent1
    Race -.->|Cancel| Agent2
    Race -.->|Cancel| Agent3
    
    style Agent1 fill:#27ae60
    style Agent2 fill:#4a90e2
    style Agent3 fill:#f39c12
    style Race fill:#e74c3c
```

---

## 7. Integration Points

### External Integrations

```mermaid
graph TB
    subgraph "SDK Core"
        Agent[Agent]
    end
    
    subgraph "AI Providers"
        VercellAI[Vercel AI SDK]
        OpenAI[OpenAI API]
        Anthropic[Anthropic API]
        Google[Google AI API]
    end
    
    subgraph "Observability"
        Langfuse[Langfuse]
        CustomTrace[Custom Tracers]
    end
    
    subgraph "State Storage"
        Memory[Memory]
        Redis[Redis]
        MongoDB[MongoDB]
    end
    
    subgraph "Tool Extensions"
        MCP[MCP Servers]
        CustomTools[Custom Tools]
    end
    
    Agent --> VercellAI
    VercellAI --> OpenAI
    VercellAI --> Anthropic
    VercellAI --> Google
    
    Agent --> Langfuse
    Agent --> CustomTrace
    
    Agent --> Memory
    Agent --> Redis
    Agent --> MongoDB
    
    Agent --> MCP
    Agent --> CustomTools
    
    style Agent fill:#4a90e2,stroke:#2c5aa0,stroke-width:3px
```

---

## 8. Data Flow

### Complete Request Flow

```mermaid
graph TB
    Start([User Request]) --> CreateAgent[Create Agent Instance]
    CreateAgent --> InitContext[Initialize Context]
    InitContext --> InitState[Create RunState]
    
    InitState --> CreateTrace[Create Langfuse Trace]
    CreateTrace --> InputGuard[Run Input Guardrails]
    
    InputGuard --> Loop{Execution Loop}
    
    Loop --> CallModel[Call AI Model<br/>via Vercel AI SDK]
    CallModel --> ParseResponse[Parse Model Response]
    
    ParseResponse --> HasTools{Has Tool Calls?}
    HasTools -->|Yes| ParallelExec[Execute Tools in Parallel]
    HasTools -->|No| CheckHandoff{Has Handoff?}
    
    ParallelExec --> RecordTools[Record Tool Results]
    RecordTools --> AddMessages[Add to Messages]
    AddMessages --> UpdateState[Update RunState]
    UpdateState --> Loop
    
    CheckHandoff -->|Yes| SwitchAgent[Switch Agent]
    SwitchAgent --> Loop
    CheckHandoff -->|No| Finish{Should Finish?}
    
    Finish -->|No| Loop
    Finish -->|Yes| OutputGuard[Run Output Guardrails]
    
    OutputGuard --> ParseSchema[Parse Output Schema]
    ParseSchema --> SaveSession[Save to Session]
    SaveSession --> EndTrace[End Trace]
    EndTrace --> BuildResult[Build RunResult]
    BuildResult --> Return([Return to User])
    
    style Start fill:#50c878
    style Return fill:#50c878
    style ParallelExec fill:#f39c12
    style CallModel fill:#4a90e2
```

---

## 🎯 Key Architecture Decisions

### 1. Autonomous Execution
**Decision**: Agent-driven, not rule-based  
**Rationale**: True intelligence requires autonomy  
**Impact**: More powerful, flexible agents

### 2. Parallel by Default
**Decision**: Automatic tool parallelization  
**Rationale**: Maximize performance without complexity  
**Impact**: 3-10x faster execution

### 3. State-First Design
**Decision**: Comprehensive RunState management  
**Rationale**: Enable complex workflows (HITL, resumption)  
**Impact**: Support for advanced patterns

### 4. Provider Agnostic
**Decision**: Use Vercel AI SDK abstraction  
**Rationale**: Flexibility, no vendor lock-in  
**Impact**: Works with any provider

### 5. Observable by Default
**Decision**: Built-in tracing everywhere  
**Rationale**: Production debugging is critical  
**Impact**: Easy troubleshooting and optimization

---

## 📚 Related Documentation

- [Core Concepts](../guides/CORE_CONCEPTS.md) - Fundamental concepts
- [API Reference](./API.md) - Complete API documentation
- [Performance Guide](./PERFORMANCE.md) - Optimization strategies

---

**Made with ❤️ by [Tawk.to](https://www.tawk.to)**

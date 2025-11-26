# Anthropic Multi-Agent Research System - Complete Details

**Source:** https://www.anthropic.com/engineering/multi-agent-research-system  
**Published:** June 13, 2025

## Overview

Claude's Research feature uses multiple Claude agents to explore complex topics more effectively. This document captures the engineering challenges and lessons learned from building this multi-agent system.

## What is a Multi-Agent System?

A multi-agent system consists of multiple agents (LLMs autonomously using tools in a loop) working together. The Research feature involves:
- An agent that plans a research process based on user queries
- Tools to create parallel agents that search for information simultaneously

## Benefits of Multi-Agent Systems

### Why Multi-Agent for Research?

1. **Open-ended problems**: Research involves unpredictable steps that can't be hardcoded
2. **Dynamic and path-dependent**: The process continuously updates based on discoveries
3. **Autonomous operation**: Requires flexibility to pivot or explore tangential connections
4. **Compression through parallelization**: Subagents operate in parallel with their own context windows, exploring different aspects simultaneously before condensing insights
5. **Separation of concerns**: Distinct tools, prompts, and exploration trajectories reduce path dependency

### Performance Metrics

- **Internal evaluation results**: Multi-agent system with Claude Opus 4 (lead) + Claude Sonnet 4 (subagents) outperformed single-agent Claude Opus 4 by **90.2%** on internal research eval
- **Example success**: When asked to identify all board members of companies in the Information Technology S&P 500, the multi-agent system succeeded while single-agent failed
- **Best use cases**: Especially excel for breadth-first queries involving multiple independent directions simultaneously

### Performance Factors

Three factors explain **95% of performance variance** in BrowseComp evaluation:
1. **Token usage** (80% of variance) - Multi-agent systems effectively scale token usage
2. **Number of tool calls**
3. **Model choice** - Claude Sonnet 4 upgrade provides larger performance gain than doubling token budget on Claude Sonnet 3.7

### Token Usage Reality

- Agents typically use **4× more tokens** than chat interactions
- Multi-agent systems use **15× more tokens** than chats
- **Economic viability**: Requires tasks where value justifies increased performance
- **Not suitable for**: Domains requiring shared context or many dependencies between agents (e.g., most coding tasks)

## Architecture Overview

### Orchestrator-Worker Pattern

The Research system uses a multi-agent architecture with:
- **Lead agent**: Coordinates the process
- **Specialized subagents**: Operate in parallel, delegated by the lead agent

### Workflow Process

1. **User Query Submission**: User submits a query
2. **LeadResearcher Agent Creation**: System creates a LeadResearcher agent
3. **Planning Phase**:
   - LeadResearcher thinks through the approach
   - Saves plan to Memory (to persist context if window exceeds 200,000 tokens)
4. **Subagent Creation**: Creates specialized Subagents with specific research tasks
5. **Parallel Research**: Each Subagent independently:
   - Performs web searches
   - Evaluates tool results using interleaved thinking
   - Returns findings to LeadResearcher
6. **Synthesis**: LeadResearcher:
   - Synthesizes results
   - Decides if more research is needed
   - Can create additional subagents or refine strategy
7. **Citation Processing**: Once sufficient information is gathered:
   - System exits research loop
   - Passes findings to CitationAgent
   - CitationAgent processes documents and research report
   - Identifies specific locations for citations
8. **Final Output**: Research results with citations returned to user

### Key Architectural Differences from RAG

- **Traditional RAG**: Static retrieval - fetches chunks most similar to query
- **Multi-agent Research**: 
  - Multi-step search that dynamically finds relevant information
  - Adapts to new findings
  - Analyzes results to formulate high-quality answers

## Prompt Engineering Principles

### 1. Think Like Your Agents

- Build simulations using Console with exact prompts and tools
- Watch agents work step-by-step
- Reveals failure modes:
  - Agents continuing when sufficient results exist
  - Overly verbose search queries
  - Incorrect tool selection
- Develop accurate mental model of agent behavior

### 2. Teach the Orchestrator How to Delegate

Each subagent needs:
- **Objective**: Clear goal
- **Output format**: Expected result structure
- **Tool and source guidance**: What to use
- **Task boundaries**: Clear limits

**Problem**: Simple instructions like "research the semiconductor shortage" led to:
- Vague interpretations
- Duplicate work (e.g., multiple agents investigating same 2025 supply chains)
- Ineffective division of labor

**Solution**: Detailed task descriptions prevent duplication and gaps

### 3. Scale Effort to Query Complexity

Embedded scaling rules in prompts:
- **Simple fact-finding**: 1 agent, 3-10 tool calls
- **Direct comparisons**: 2-4 subagents, 10-15 calls each
- **Complex research**: 10+ subagents with clearly divided responsibilities

Prevents overinvestment in simple queries (common early failure mode)

### 4. Tool Design and Selection Are Critical

- Agent-tool interfaces are as critical as human-computer interfaces
- Using the right tool is often strictly necessary
- Tool design must match agent capabilities and limitations

### 5. Source Quality Matters

**Problem**: Agents chose SEO-optimized content farms over authoritative sources (academic PDFs, personal blogs)

**Solution**: Added source quality heuristics to prompts

### Key Prompt Engineering Insight

Multi-agent systems have **emergent behaviors** that arise without specific programming. Small changes to lead agent can unpredictably change subagent behavior. Success requires understanding interaction patterns, not just individual agent behavior.

**Best prompts are frameworks for collaboration** that define:
- Division of labor
- Problem-solving approaches
- Effort budgets

## Production Reliability and Engineering Challenges

### 1. Agents Are Stateful and Errors Compound

**Challenge**: 
- Agents run for long periods, maintaining state across many tool calls
- Minor system failures can be catastrophic
- Can't just restart from beginning (expensive and frustrating)

**Solutions**:
- Durable execution code
- Error handling along the way
- Resume from where agent was when errors occurred
- Let agent know when tool is failing and adapt
- Combine AI adaptability with deterministic safeguards:
  - Retry logic
  - Regular checkpoints

### 2. Debugging Benefits from New Approaches

**Challenge**:
- Agents make dynamic decisions
- Non-deterministic between runs (even with identical prompts)
- Hard to diagnose failures (bad search queries? poor sources? tool failures?)

**Solutions**:
- Full production tracing to diagnose why agents failed
- Monitor agent decision patterns and interaction structures
- High-level observability (without monitoring conversation contents for privacy)
- Helps diagnose root causes, discover unexpected behaviors, fix common failures

### 3. Deployment Needs Careful Coordination

**Challenge**:
- Agent systems are highly stateful webs of prompts, tools, and execution logic
- Run almost continuously
- Agents might be anywhere in their process during deployment
- Can't update every agent to new version simultaneously

**Solution**: 
- **Rainbow deployments**: Gradually shift traffic from old to new versions
- Keep both versions running simultaneously
- Avoid disrupting running agents

### 4. Synchronous Execution Creates Bottlenecks

**Current State**:
- Lead agents execute subagents synchronously
- Wait for each set of subagents to complete before proceeding
- Simplifies coordination but creates bottlenecks

**Limitations**:
- Lead agent can't steer subagents
- Subagents can't coordinate
- Entire system blocked while waiting for single subagent

**Future Direction**:
- Asynchronous execution would enable additional parallelism
- Agents working concurrently
- Creating new subagents when needed
- **Challenges**: Result coordination, state consistency, error propagation
- Expected performance gains will justify complexity as models handle longer tasks

## Use Cases

Top use case categories (from Clio embedding plot):
1. **Developing software systems** across specialized domains (10%)
2. **Develop and optimize professional and technical content** (8%)
3. **Develop business growth and revenue generation strategies** (8%)
4. **Assist with academic research and educational material development** (7%)
5. **Research and verify information** about people, places, or organizations (5%)

### User Feedback Examples

- Found business opportunities they hadn't considered
- Navigated complex healthcare options
- Resolved thorny technical bugs
- Saved up to days of work by uncovering research connections

## Appendix: Additional Tips

### End-State Evaluation of Agents That Mutate State

**Challenge**: Evaluating agents that modify persistent state across multi-turn conversations

**Approach**:
- Focus on **end-state evaluation** rather than turn-by-turn analysis
- Don't judge whether agent followed specific process
- Evaluate whether it achieved correct final state
- For complex workflows: break evaluation into discrete checkpoints where specific state changes should have occurred

### Long-Horizon Conversation Management

**Challenge**: Production agents engage in conversations spanning hundreds of turns

**Solutions**:
- Intelligent compression and memory mechanisms
- Agents summarize completed work phases
- Store essential information in external memory before proceeding
- When context limits approach:
  - Spawn fresh subagents with clean contexts
  - Maintain continuity through careful handoffs
  - Retrieve stored context (like research plan) from memory
- Distributed approach prevents context overflow while preserving conversation coherence

### Subagent Output to Filesystem to Minimize 'Game of Telephone'

**Pattern**: Direct subagent outputs bypass main coordinator for certain result types

**Benefits**:
- Improves fidelity and performance
- Prevents information loss during multi-stage processing
- Reduces token overhead from copying large outputs through conversation history

**Implementation**:
- Subagents call tools to store work in external systems
- Pass lightweight references back to coordinator
- Works well for structured outputs: code, reports, data visualizations

## Key Takeaways

1. **Multi-agent systems excel at**: Valuable tasks involving heavy parallelization, information exceeding single context windows, interfacing with numerous complex tools

2. **The last mile is most of the journey**: Codebases that work on developer machines require significant engineering for reliable production systems

3. **Compound nature of errors**: Minor issues for traditional software can derail agents entirely

4. **Success factors**:
   - Careful engineering
   - Comprehensive testing
   - Detail-oriented prompt and tool design
   - Robust operational practices
   - Tight collaboration between research, product, and engineering teams
   - Strong understanding of current agent capabilities

5. **Open-source resources**: See the open-source prompts in Anthropic's Cookbook for example prompts from their system

## Acknowledgments

Written by: Jeremy Hadfield, Barry Zhang, Kenneth Lien, Florian Scholz, Jeremy Fox, and Daniel Ford

Reflects collective efforts of several teams across Anthropic. Special thanks to the Anthropic apps engineering team and early users for feedback.


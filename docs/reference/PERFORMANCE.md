# Performance Optimization

Strategies for optimizing agent performance and reducing costs.

## Embedding Optimization

### Use Batch Processing

Batch embedding generation is 5x faster than individual calls:

```typescript
// ❌ Slow - Individual calls
for (const text of texts) {
  const embedding = await generateEmbeddingAI({ model, value: text });
}

// ✅ Fast - Batch processing
const result = await generateEmbeddingsAI({ model, values: texts });
const embeddings = result.embeddings;
```

### Enable Caching

Embedding generation includes automatic LRU caching:

```typescript
// First call - API request
const embedding1 = await generateEmbeddingAI({ model, value: 'text' });

// Second call - Cached (1000x faster)
const embedding2 = await generateEmbeddingAI({ model, value: 'text' });
```

## Tool Execution

### Parallel Tool Execution

The SDK automatically executes multiple tools in parallel:

```typescript
// Agent calls multiple tools - executed in parallel
const agent = new Agent({
  tools: {
    tool1: { /* ... */ },
    tool2: { /* ... */ },
    tool3: { /* ... */ }
  }
});

// All three tools execute simultaneously
await run(agent, 'Use all tools');
```

### Optimize Tool Responses

Use TOON format for large tool responses (42% token reduction):

```typescript
const agent = new Agent({
  tools: {
    getUsers: {
      description: 'Get user list',
      parameters: z.object({}),
      execute: async () => {
        const users = await db.users.find().toArray();
        // Return TOON instead of JSON (42% smaller)
        return encodeTOON(users);
      }
    }
  }
});
```

## Session Management

### Choose the Right Storage

- **MemorySession**: Fastest, but not persistent
- **RedisSession**: Fast, persistent, good for production
- **DatabaseSession**: Slower, but more durable
- **HybridSession**: Best of both worlds

```typescript
// For high-traffic production
const session = new RedisSession('user-123', {
  redis: redisClient,
  ttl: 3600 // Cache for 1 hour
});
```

### Limit Message History

Limit stored messages to reduce context size:

```typescript
const session = new RedisSession('user-123', {
  redis: redisClient,
  maxMessages: 20 // Only keep last 20 messages
});
```

## Model Selection

### Use Faster Models for Simple Tasks

```typescript
// ✅ Fast and cheap for simple tasks
const fastAgent = new Agent({
  model: openai('gpt-4o-mini'),
  instructions: 'Quick responses'
});

// ✅ Powerful for complex tasks
const smartAgent = new Agent({
  model: openai('gpt-4o'),
  instructions: 'Detailed analysis'
});
```

### Race Agents for Best Performance

Run multiple agents in parallel and use the fastest:

```typescript
const result = await raceAgents(
  [fastAgent, smartAgent],
  'Simple question',
  { timeoutMs: 3000 }
);
```

## Guardrails

### Use Efficient Models

Use smaller models for guardrails:

```typescript
// ✅ Efficient
const result = await run(agent, input, {
  inputGuardrails: [
    contentSafetyGuardrail({ 
      model: openai('gpt-4o-mini') // Smaller, faster model
    })
  ]
});
```

### Parallel Guardrail Execution

Guardrails execute in parallel automatically:

```typescript
// All guardrails execute simultaneously
const result = await run(agent, input, {
  inputGuardrails: [
    guardrail1,
    guardrail2,
    guardrail3
  ]
});
```

## Streaming

### Use Streaming for Long Responses

Streaming provides better perceived performance:

```typescript
// ✅ Better UX - user sees response immediately
const stream = await runStream(agent, 'Tell a long story');
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

## Caching Strategies

### Cache Embeddings

Embeddings are automatically cached, but you can also cache at application level:

```typescript
const embeddingCache = new Map<string, number[]>();

async function getCachedEmbedding(text: string) {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text)!;
  }
  
  const result = await generateEmbeddingAI({ model, value: text });
  embeddingCache.set(text, result.embedding);
  return result.embedding;
}
```

### Cache Agent Responses

For deterministic queries, cache agent responses:

```typescript
const responseCache = new Map<string, string>();

async function getCachedResponse(query: string) {
  const cacheKey = hashQuery(query);
  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey)!;
  }
  
  const result = await run(agent, query);
  responseCache.set(cacheKey, result.finalOutput);
  return result.finalOutput;
}
```

## Monitoring

### Track Token Usage

Monitor token usage to optimize costs:

```typescript
const result = await run(agent, 'Hello');

console.log('Tokens used:', result.metadata.usage.totalTokens);
console.log('Cost:', calculateCost(result.metadata.usage));
```

### Monitor Performance

Track execution times:

```typescript
const start = Date.now();
const result = await run(agent, 'Hello');
const duration = Date.now() - start;

console.log(`Execution time: ${duration}ms`);
```

## Best Practices

1. **Batch operations** when possible
2. **Use caching** for repeated operations
3. **Choose appropriate models** for each task
4. **Limit context size** with message limits
5. **Use streaming** for better UX
6. **Monitor token usage** to optimize costs
7. **Parallel execution** for multiple operations

---

For more details, see:
- [API Reference](./API.md)
- [Architecture](./ARCHITECTURE.md)
- [Getting Started](../getting-started/GETTING_STARTED.md)
- [Core Concepts](../guides/CORE_CONCEPTS.md)


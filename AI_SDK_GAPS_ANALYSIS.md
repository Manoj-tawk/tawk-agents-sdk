# AI SDK Documentation Gaps Analysis
## Comparing Official AI SDK Docs vs Our Codebase

### Executive Summary

We're using `generateText` and `streamText` correctly, but we're **missing several advanced features** from the AI SDK:
- ❌ `generateObject` / `streamObject` for structured data
- ❌ `experimental_output` for structured outputs with `generateText`/`streamText`
- ❌ Error handling for structured outputs (`NoObjectGeneratedError`, `repairText`)
- ❌ Stream callbacks (`onError`, `onChunk`, `onFinish`)
- ❌ Stream transformations (`experimental_transform`, `smoothStream`)
- ❌ Best practices (temperature: 0 for tools, `.nullable()` vs `.optional()`)
- ❌ Advanced features (sources, warnings, request/response inspection)

---

## 1. Structured Data Generation

### ❌ Missing: `generateObject` / `streamObject`

**AI SDK Docs:**
```typescript
import { generateObject } from 'ai';
const { object } = await generateObject({
  model: 'anthropic/claude-sonnet-4.5',
  schema: z.object({ recipe: z.object({...}) }),
  prompt: 'Generate a lasagna recipe.',
});
```

**Our Implementation:**
- ✅ We use `outputSchema` with `generateText` (works but not optimal)
- ❌ We don't use `generateObject` / `streamObject` (dedicated functions)
- ❌ We don't support `output: 'array'` strategy
- ❌ We don't support `output: 'enum'` strategy
- ❌ We don't support `output: 'no-schema'` strategy
- ❌ We don't support `schemaName` and `schemaDescription`

**Impact:**
- Less optimal for structured data generation
- Missing array streaming (`elementStream`)
- Missing enum classification
- Missing schema metadata for better LLM guidance

**Recommendation:**
- Add support for `generateObject` / `streamObject` as an alternative to `outputSchema`
- Support all output strategies (object, array, enum, no-schema)
- Add `schemaName` and `schemaDescription` to `AgentConfig`

---

## 2. Experimental Features

### ❌ Missing: `experimental_output` with `generateText`/`streamText`

**AI SDK Docs:**
```typescript
const { experimental_output } = await generateText({
  experimental_output: Output.object({
    schema: z.object({ name: z.string(), age: z.number() }),
  }),
  prompt: 'Generate an example person.',
});
```

**Our Implementation:**
- ✅ We use `outputSchema` (works)
- ❌ We don't support `experimental_output` (alternative approach)
- ❌ We don't support `experimental_partialOutputStream` for streaming

**Impact:**
- Missing alternative structured output approach
- Some models (OpenAI) support structured outputs + tool calling simultaneously (only with `experimental_output`)

**Recommendation:**
- Add `experimental_output` option to `AgentConfig`
- Support both `outputSchema` and `experimental_output`

---

### ❌ Missing: `experimental_repairText` for JSON Repair

**AI SDK Docs:**
```typescript
const { object } = await generateObject({
  model,
  schema,
  prompt,
  experimental_repairText: async ({ text, error }) => {
    // Repair invalid JSON
    return text + '}';
  },
});
```

**Our Implementation:**
- ❌ We don't support JSON repair
- ❌ We don't handle `JSONParseError` or `TypeValidationError`

**Impact:**
- No automatic JSON repair when model generates malformed JSON
- Users must handle parsing errors manually

**Recommendation:**
- Add `experimental_repairText` callback to `AgentConfig`
- Automatically attempt JSON repair for structured outputs

---

### ❌ Missing: `experimental_transform` for Stream Transformations

**AI SDK Docs:**
```typescript
import { smoothStream, streamText } from 'ai';
const result = streamText({
  model,
  prompt,
  experimental_transform: smoothStream(), // or custom transform
});
```

**Our Implementation:**
- ❌ We don't support stream transformations
- ❌ We don't expose `smoothStream` utility
- ❌ We don't support custom transformations

**Impact:**
- No stream smoothing (can cause janky UI)
- No custom stream filtering/transformation
- No ability to stop streams based on content

**Recommendation:**
- Add `experimental_transform` option to `AgentConfig`
- Support `smoothStream()` and custom transformations
- Export stream transformation utilities

---

## 3. Error Handling

### ❌ Missing: `NoObjectGeneratedError` Handling

**AI SDK Docs:**
```typescript
import { generateObject, NoObjectGeneratedError } from 'ai';
try {
  await generateObject({ model, schema, prompt });
} catch (error) {
  if (NoObjectGeneratedError.isInstance(error)) {
    console.log('Cause:', error.cause);
    console.log('Text:', error.text);
    console.log('Response:', error.response);
    console.log('Usage:', error.usage);
  }
}
```

**Our Implementation:**
- ❌ We don't handle `NoObjectGeneratedError` specifically
- ❌ We don't expose error details (cause, text, response, usage)
- ❌ We don't provide error recovery strategies

**Impact:**
- Less informative error messages for structured output failures
- No structured error handling for users

**Recommendation:**
- Import and handle `NoObjectGeneratedError`
- Expose error details in our error types
- Provide error recovery strategies

---

## 4. Stream Callbacks

### ❌ Missing: `onError` Callback

**AI SDK Docs:**
```typescript
const result = streamText({
  model: 'anthropic/claude-sonnet-4.5',
  prompt: '...',
  onError({ error }) {
    console.error(error); // Error logging
  },
});
```

**Our Implementation:**
- ❌ We don't expose `onError` callback
- ❌ Errors in streams might crash servers (docs warn about this)

**Impact:**
- No way to handle stream errors gracefully
- Potential server crashes from unhandled stream errors

**Recommendation:**
- Add `onError` callback to `RunOptions` for `runStream()`
- Forward to AI SDK's `onError` callback

---

### ❌ Missing: `onChunk` Callback

**AI SDK Docs:**
```typescript
const result = streamText({
  model: 'anthropic/claude-sonnet-4.5',
  prompt: '...',
  onChunk({ chunk }) {
    if (chunk.type === 'text') {
      console.log(chunk.text);
    }
  },
});
```

**Our Implementation:**
- ❌ We don't expose `onChunk` callback
- ✅ We have `fullStream` but it's our own format

**Impact:**
- No direct access to AI SDK's chunk events
- Users must use our `fullStream` format instead

**Recommendation:**
- Add `onChunk` callback to `RunOptions` for `runStream()`
- Forward to AI SDK's `onChunk` callback

---

### ❌ Missing: `onFinish` Callback

**AI SDK Docs:**
```typescript
const result = streamText({
  model: 'anthropic/claude-sonnet-4.5',
  prompt: '...',
  onFinish({ text, finishReason, usage, response, steps, totalUsage }) {
    // Save chat history, record usage, etc.
    const messages = response.messages;
  },
});
```

**Our Implementation:**
- ❌ We don't expose `onFinish` callback
- ✅ We have `completed` promise but it's different

**Impact:**
- No direct callback for stream completion
- Users must await `completed` promise instead

**Recommendation:**
- Add `onFinish` callback to `RunOptions` for `runStream()`
- Forward to AI SDK's `onFinish` callback

---

## 5. Best Practices

### ⚠️ Missing: Temperature Recommendation for Tools

**AI SDK Docs:**
> For tool calls and object generation, it's recommended to use `temperature: 0` to ensure deterministic and consistent results.

**Our Implementation:**
- ✅ We support `temperature` in `modelSettings`
- ❌ We don't recommend `temperature: 0` for tools
- ❌ We don't auto-set `temperature: 0` when tools are present

**Impact:**
- Users might use high temperature with tools (inconsistent results)
- No guidance on best practices

**Recommendation:**
- Add documentation recommending `temperature: 0` for tools
- Optionally auto-set `temperature: 0` when tools are present (with override option)

---

### ⚠️ Missing: `.nullable()` vs `.optional()` Best Practice

**AI SDK Docs:**
> When working with tools that have optional parameters, you may encounter compatibility issues with certain providers that use strict schema validation. For maximum compatibility, optional parameters should use `.nullable()` instead of `.optional()`.

**Our Implementation:**
- ❌ We use `.optional()` in several places:
  - `src/core/agent.ts` (handoff context)
  - `src/tools/rerank/rerank.ts` (topN)
  - `src/tools/image/generate-image.ts` (size, n)
  - `src/tools/audio/generate-speech.ts` (voice, speed)
  - `src/tools/audio/transcribe.ts` (language)

**Impact:**
- Potential compatibility issues with strict schema validation (OpenAI structured outputs)
- Tools might fail with certain providers

**Recommendation:**
- Replace `.optional()` with `.nullable()` in tool schemas
- Update documentation to recommend `.nullable()` for optional parameters
- Add migration guide for existing tools

---

## 6. Advanced Features

### ❌ Missing: Sources Support

**AI SDK Docs:**
```typescript
const result = await generateText({
  model: 'google/gemini-2.5-flash',
  tools: { google_search: google.tools.googleSearch({}) },
  prompt: 'List top 5 San Francisco news.',
});

for (const source of result.sources) {
  if (source.sourceType === 'url') {
    console.log('URL:', source.url);
    console.log('Title:', source.title);
  }
}
```

**Our Implementation:**
- ❌ We don't expose `result.sources`
- ❌ We don't handle source metadata

**Impact:**
- No access to source citations (useful for RAG systems)
- Missing attribution information

**Recommendation:**
- Expose `sources` in `RunResult`
- Add source handling in `StreamResult`
- Document source usage in RAG examples

---

### ❌ Missing: Warnings Inspection

**AI SDK Docs:**
```typescript
const result = await generateText({
  model: 'anthropic/claude-sonnet-4.5',
  prompt: 'Hello, world!',
});
console.log(result.warnings); // Check for unsupported features
```

**Our Implementation:**
- ❌ We don't expose `result.warnings`
- ❌ No way to check if provider supports all features

**Impact:**
- Users can't verify if their prompt/tools/settings are fully supported
- Silent feature degradation possible

**Recommendation:**
- Expose `warnings` in `RunResult`
- Add warning handling in `StreamResult`
- Log warnings in development mode

---

### ❌ Missing: Request/Response Inspection

**AI SDK Docs:**
```typescript
const result = await generateText({
  model: 'anthropic/claude-sonnet-4.5',
  prompt: 'Hello, world!',
});
console.log(result.request.body); // Raw HTTP request body
console.log(result.response.headers); // Response headers
console.log(result.response.body); // Response body
```

**Our Implementation:**
- ❌ We don't expose `result.request` or `result.response`
- ❌ No access to raw provider responses

**Impact:**
- Can't debug provider-specific issues
- Can't access provider-specific metadata
- Can't inspect exact payloads sent to providers

**Recommendation:**
- Expose `request` and `response` in `RunResult`
- Add to `StreamResult` as well
- Document provider-specific metadata access

---

## 7. Reasoning Access

### ❌ Missing: Reasoning Property

**AI SDK Docs:**
```typescript
const result = await generateObject({
  model: 'openai/gpt-5',
  schema: z.object({...}),
  prompt: 'Generate a lasagna recipe.',
  providerOptions: {
    openai: {
      reasoningSummary: 'detailed',
    },
  },
});
console.log(result.reasoning); // Model's thought process
```

**Our Implementation:**
- ❌ We don't expose `result.reasoning`
- ❌ We don't support `reasoningSummary` in provider options

**Impact:**
- No access to model's reasoning process
- Missing debugging/transparency feature

**Recommendation:**
- Expose `reasoning` in `RunResult`
- Add `providerOptions` to `AgentConfig.modelSettings`
- Support reasoning for OpenAI models

---

## 8. Zod Date Handling

### ⚠️ Missing: Date Transformation Best Practice

**AI SDK Docs:**
```typescript
const result = await generateObject({
  model: 'anthropic/claude-sonnet-4.5',
  schema: z.object({
    events: z.array(
      z.object({
        event: z.string(),
        date: z.string().date().transform(value => new Date(value)),
      }),
    ),
  }),
  prompt: 'List 5 important events from the year 2000.',
});
```

**Our Implementation:**
- ❌ We don't document date transformation patterns
- ❌ No examples of handling Zod dates with AI SDK

**Impact:**
- Users might struggle with date handling
- No guidance on date transformations

**Recommendation:**
- Add date transformation examples to documentation
- Document Zod date best practices
- Add date handling utilities

---

## 9. Message Format Handling

### ✅ Correct: Using `convertToModelMessages()`

**AI SDK Docs:**
> Use `convertToModelMessages()` to convert `UIMessage[]` to `ModelMessage[]`.

**Our Implementation:**
- ✅ We use `convertToModelMessages()` in `prepareMessages()`
- ✅ We have safety check before `generateText()`
- ⚠️ We need to fix sessions (as discussed)

**Status:** ✅ Mostly correct, needs session fixes

---

## 10. Full Stream Format

### ⚠️ Potential Mismatch: Our `fullStream` vs AI SDK's `fullStream`

**AI SDK Docs:**
```typescript
for await (const part of result.fullStream) {
  switch (part.type) {
    case 'start': { break; }
    case 'text-delta': { break; }
    case 'tool-call': { break; }
    // ... many more types
  }
}
```

**Our Implementation:**
- ✅ We create our own `fullStream` in `createFullStream()`
- ⚠️ Might not match AI SDK's exact format
- ⚠️ Might be missing some event types

**Impact:**
- Potential incompatibility with AI SDK UI components
- Missing event types

**Recommendation:**
- Verify our `fullStream` matches AI SDK's format
- Use AI SDK's `fullStream` directly if possible
- Document any differences

---

## Summary of Gaps

### Critical (Should Fix)
1. ❌ **Error Handling**: `NoObjectGeneratedError` handling
2. ❌ **Stream Callbacks**: `onError`, `onChunk`, `onFinish`
3. ⚠️ **Best Practices**: `.nullable()` vs `.optional()` in tool schemas
4. ⚠️ **Temperature**: Recommend `temperature: 0` for tools

### Important (Should Consider)
5. ❌ **Structured Data**: `generateObject` / `streamObject` support
6. ❌ **Experimental Features**: `experimental_output`, `experimental_repairText`, `experimental_transform`
7. ❌ **Advanced Features**: Sources, warnings, request/response inspection
8. ❌ **Reasoning**: Access to model reasoning

### Nice to Have (Future Enhancements)
9. ⚠️ **Documentation**: Date transformation, best practices
10. ⚠️ **Stream Format**: Verify `fullStream` compatibility

---

## Recommended Action Plan

### Phase 1: Critical Fixes (Immediate)
1. Fix `.optional()` → `.nullable()` in tool schemas
2. Add `NoObjectGeneratedError` handling
3. Add stream callbacks (`onError`, `onChunk`, `onFinish`)
4. Document `temperature: 0` recommendation for tools

### Phase 2: Important Features (Next Sprint)
5. Add `generateObject` / `streamObject` support
6. Add `experimental_output` support
7. Expose sources, warnings, request/response
8. Add `experimental_repairText` support

### Phase 3: Advanced Features (Future)
9. Add `experimental_transform` support
10. Add reasoning access
11. Verify `fullStream` compatibility
12. Enhanced documentation

---

## Files to Modify

### Core Files
- `src/core/agent.ts` - Add new features, fix best practices
- `src/core/run.ts` - Add stream callbacks, error handling

### Tool Files (Fix `.optional()` → `.nullable()`)
- `src/core/agent.ts` (handoff context)
- `src/tools/rerank/rerank.ts`
- `src/tools/image/generate-image.ts`
- `src/tools/audio/generate-speech.ts`
- `src/tools/audio/transcribe.ts`

### Documentation
- `docs/guides/BEST_PRACTICES.md` - Add temperature, nullable recommendations
- `docs/reference/API.md` - Document new features
- `docs/examples/STRUCTURED_DATA.md` - Add generateObject examples

---

## Testing Checklist

- [ ] Test `generateObject` / `streamObject` with all output strategies
- [ ] Test `experimental_output` with tool calling
- [ ] Test `experimental_repairText` with malformed JSON
- [ ] Test stream callbacks (`onError`, `onChunk`, `onFinish`)
- [ ] Test `.nullable()` vs `.optional()` with strict schema validation
- [ ] Test `temperature: 0` with tools
- [ ] Test sources extraction (Perplexity, Google)
- [ ] Test warnings inspection
- [ ] Test request/response inspection
- [ ] Test reasoning access (OpenAI)
- [ ] Test date transformations
- [ ] Verify `fullStream` compatibility


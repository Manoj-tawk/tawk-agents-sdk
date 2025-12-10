"use strict";
/**
 * Session Management System
 *
 * @module sessions
 * @description
 * Production-ready conversation history and state management.
 *
 * **Session Types**:
 * - **MemorySession**: In-memory storage for development/testing
 * - **RedisSession**: Persistent Redis storage for production
 * - **SessionManager**: Centralized session lifecycle management
 *
 * **Features**:
 * - Automatic conversation history tracking
 * - Message windowing for token optimization
 * - Metadata storage for context persistence
 * - TTL support for automatic cleanup
 * - Thread-safe operations
 * - Comprehensive error handling
 *
 * **Use Cases**:
 * - Multi-turn conversations
 * - User context preservation
 * - Distributed systems (via Redis)
 * - Long-running agent workflows
 *
 * @author Tawk.to
 * @license MIT
 * @version 1.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = exports.HybridSession = exports.DatabaseSession = exports.RedisSession = exports.MemorySession = void 0;
// ============================================
// IN-MEMORY SESSION (for development/testing)
// ============================================
/**
 * In-memory session storage for development and testing.
 * Messages are stored in memory and lost when the process exits.
 *
 * @template TContext - Type of context object
 *
 * @example
 * ```typescript
 * const session = new MemorySession('user-123', 50);
 * await run(agent, 'Hello', { session });
 * ```
 */
class MemorySession {
    /**
     * Create a new in-memory session.
     *
     * @param {string} id - Unique session identifier
     * @param {number} [maxMessages] - Maximum number of messages to keep (sliding window)
     * @param {SummarizationConfig} [summarizationConfig] - Optional auto-summarization config
     */
    constructor(id, maxMessages, summarizationConfig) {
        this.messages = [];
        this.metadata = {};
        this.id = id;
        this.maxMessages = maxMessages;
        this.summarizationConfig = summarizationConfig;
    }
    async getHistory() {
        // Return messages as-is - AI SDK provides correct ModelMessage[] format
        // No normalization needed - storage/retrieval happens naturally via JSON
        return this.messages;
    }
    async addMessages(messages) {
        // Store messages as-is - AI SDK provides correct ModelMessage[] format
        // No normalization needed - trust the source
        this.messages.push(...messages);
        // Check if we should summarize
        if (this.summarizationConfig?.enabled) {
            this.messages = await this.checkAndSummarize(this.messages);
        }
        // Otherwise, use simple sliding window
        else if (this.maxMessages && this.messages.length > this.maxMessages) {
            this.messages = this.messages.slice(-this.maxMessages);
        }
    }
    async checkAndSummarize(messages) {
        if (!this.summarizationConfig)
            return messages;
        const { messageThreshold, keepRecentMessages } = this.summarizationConfig;
        // Count non-system messages (exclude existing summaries)
        const nonSystemMessages = messages.filter(msg => !(msg.role === 'system' && typeof msg.content === 'string' && msg.content.includes('Previous conversation summary')));
        // Only summarize if we exceed threshold
        if (nonSystemMessages.length <= messageThreshold) {
            return messages;
        }
        try {
            // Find existing summary (if any)
            const existingSummaryIndex = messages.findIndex(msg => msg.role === 'system' && typeof msg.content === 'string' && msg.content.includes('Previous conversation summary'));
            let existingSummary;
            if (existingSummaryIndex >= 0) {
                const summaryMsg = messages[existingSummaryIndex];
                existingSummary = typeof summaryMsg.content === 'string'
                    ? summaryMsg.content.replace('Previous conversation summary:\n', '')
                    : undefined;
                // Remove old summary
                messages.splice(existingSummaryIndex, 1);
            }
            // Messages to summarize (all except recent ones)
            const toSummarize = messages.slice(0, -keepRecentMessages);
            const recentMessages = messages.slice(-keepRecentMessages);
            // Generate summary
            const newSummary = await this.generateSummary(toSummarize, existingSummary);
            // Create summary as system message
            const summaryMessage = {
                role: 'system',
                content: `Previous conversation summary:\n${newSummary}`
            };
            // Return: [summary, recent messages]
            return [summaryMessage, ...recentMessages];
        }
        catch (_error) {
            if (process.env.NODE_ENV === 'development') {
                // Summarization failed, keep existing state
            }
            // Fallback to sliding window
            if (this.maxMessages && messages.length > this.maxMessages) {
                return messages.slice(-this.maxMessages);
            }
            return messages;
        }
    }
    async generateSummary(messages, previousSummary) {
        if (!this.summarizationConfig) {
            throw new Error('Summarization config not set');
        }
        // Build conversation text
        const conversationText = messages
            .map(msg => `${msg.role}: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`)
            .join('\n\n');
        // Use custom prompt or default
        const summaryPrompt = this.summarizationConfig.summaryPrompt ||
            `Summarize the following conversation concisely, preserving all important facts, context, and information about the user. Focus on:
- User's identity (name, job, background)
- Key facts mentioned
- Topics discussed
- Important context

Conversation:
${conversationText}

Summary (2-3 paragraphs):`;
        // If previous summary exists, include it
        const fullPrompt = previousSummary
            ? `Previous summary:\n${previousSummary}\n\n${summaryPrompt}`
            : summaryPrompt;
        // Use the provided model or create simple summary
        if (this.summarizationConfig.model) {
            const { generateText } = await Promise.resolve().then(() => __importStar(require('ai')));
            const result = await generateText({
                model: this.summarizationConfig.model,
                prompt: fullPrompt,
                maxTokens: 500,
            });
            return result.text;
        }
        else {
            // Simple fallback
            return this.createSimpleSummary(messages, previousSummary);
        }
    }
    createSimpleSummary(messages, previousSummary) {
        const facts = [];
        messages.forEach(msg => {
            const content = typeof msg.content === 'string' ? msg.content : '';
            if (content.includes("I'm") || content.includes("I am") ||
                content.includes("My name") || content.includes("I work") ||
                content.includes("I live") || content.includes("I graduated")) {
                facts.push(content);
            }
        });
        if (previousSummary) {
            return `${previousSummary}\n\nAdditional context: ${facts.slice(0, 5).join('. ')}`;
        }
        return facts.slice(0, 10).join('. ');
    }
    async clear() {
        this.messages = [];
        this.metadata = {};
    }
    async getMetadata() {
        return { ...this.metadata };
    }
    async updateMetadata(metadata) {
        this.metadata = { ...this.metadata, ...metadata };
    }
}
exports.MemorySession = MemorySession;
/**
 * Redis-backed session storage for production use.
 * Provides fast access with automatic expiration.
 *
 * @template TContext - Type of context object
 *
 * @example
 * ```typescript
 * import Redis from 'ioredis';
 * const redis = new Redis();
 * const session = new RedisSession('user-123', {
 *   redis,
 *   ttl: 3600,
 *   maxMessages: 50
 * });
 * ```
 */
class RedisSession {
    constructor(id, config) {
        this.id = id;
        this.redis = config.redis;
        this.keyPrefix = config.keyPrefix || 'agent:session:';
        this.ttl = config.ttl || 3600; // Default 1 hour
        this.maxMessages = config.maxMessages;
        this.summarizationConfig = config.summarization;
    }
    getMessagesKey() {
        return `${this.keyPrefix}${this.id}:messages`;
    }
    getMetadataKey() {
        return `${this.keyPrefix}${this.id}:metadata`;
    }
    async getHistory() {
        const key = this.getMessagesKey();
        // Use list operations for efficient message retrieval
        if (!this.summarizationConfig?.enabled) {
            const range = this.maxMessages ? -this.maxMessages : 0;
            const messagesJson = await this.redis.lrange(key, range, -1);
            if (!messagesJson || messagesJson.length === 0) {
                return [];
            }
            // Parse and return as-is - AI SDK provides correct ModelMessage[] format
            return messagesJson.map(json => JSON.parse(json));
        }
        // Legacy path for summarization (uses single JSON blob)
        const messagesJson = await this.redis.get(key);
        if (!messagesJson) {
            return [];
        }
        const messages = JSON.parse(messagesJson);
        return Array.isArray(messages) ? messages : [];
    }
    async addMessages(messages) {
        if (messages.length === 0)
            return;
        const key = this.getMessagesKey();
        // Store messages as-is - AI SDK provides correct ModelMessage[] format
        // Check if we should summarize
        if (this.summarizationConfig?.enabled) {
            // Get existing messages for summarization
            let existingMessages = await this.getHistory();
            existingMessages.push(...messages);
            existingMessages = await this.checkAndSummarize(existingMessages);
            // Save back to Redis with TTL
            await this.redis.setex(key, this.ttl, JSON.stringify(existingMessages));
        }
        else {
            // Use Redis pipeline for atomic batch operations
            const pipeline = this.redis.pipeline();
            // Serialize messages once (no normalization needed)
            const serialized = messages.map(m => JSON.stringify(m));
            // Append all messages at once
            if (serialized.length > 0) {
                pipeline.rpush(key, ...serialized);
            }
            // Trim to max length
            if (this.maxMessages) {
                pipeline.ltrim(key, -this.maxMessages, -1);
            }
            // Set TTL
            pipeline.expire(key, this.ttl);
            // Execute all commands in one round-trip
            await pipeline.exec();
        }
    }
    async checkAndSummarize(messages) {
        if (!this.summarizationConfig)
            return messages;
        const { messageThreshold, keepRecentMessages } = this.summarizationConfig;
        // Count non-system messages (exclude existing summaries)
        const nonSystemMessages = messages.filter(msg => !(msg.role === 'system' && typeof msg.content === 'string' && msg.content.includes('Previous conversation summary')));
        // Only summarize if we exceed threshold
        if (nonSystemMessages.length <= messageThreshold) {
            return messages;
        }
        try {
            // Find existing summary (if any)
            const existingSummaryIndex = messages.findIndex(msg => msg.role === 'system' && typeof msg.content === 'string' && msg.content.includes('Previous conversation summary'));
            let existingSummary;
            if (existingSummaryIndex >= 0) {
                const summaryMsg = messages[existingSummaryIndex];
                existingSummary = typeof summaryMsg.content === 'string'
                    ? summaryMsg.content.replace('Previous conversation summary:\n', '')
                    : undefined;
                // Remove old summary
                messages.splice(existingSummaryIndex, 1);
            }
            // Messages to summarize (all except recent ones)
            const toSummarize = messages.slice(0, -keepRecentMessages);
            const recentMessages = messages.slice(-keepRecentMessages);
            // Generate summary
            const newSummary = await this.generateSummary(toSummarize, existingSummary);
            // Create summary as system message
            const summaryMessage = {
                role: 'system',
                content: `Previous conversation summary:\n${newSummary}`
            };
            // Return: [summary, recent messages]
            return [summaryMessage, ...recentMessages];
        }
        catch (_error) {
            if (process.env.NODE_ENV === 'development') {
                // Summarization failed, keep existing state
            }
            // Fallback to sliding window
            if (this.maxMessages && messages.length > this.maxMessages) {
                return messages.slice(-this.maxMessages);
            }
            return messages;
        }
    }
    async generateSummary(messages, previousSummary) {
        if (!this.summarizationConfig) {
            throw new Error('Summarization config not set');
        }
        // Build conversation text
        const conversationText = messages
            .map(msg => `${msg.role}: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`)
            .join('\n\n');
        // Use custom prompt or default
        const summaryPrompt = this.summarizationConfig.summaryPrompt ||
            `Summarize the following conversation concisely, preserving all important facts, context, and information about the user. Focus on:
- User's identity (name, job, background)
- Key facts mentioned
- Topics discussed
- Important context

Conversation:
${conversationText}

Summary (2-3 paragraphs):`;
        // If previous summary exists, include it
        const fullPrompt = previousSummary
            ? `Previous summary:\n${previousSummary}\n\n${summaryPrompt}`
            : summaryPrompt;
        // Use the provided model or create simple summary
        if (this.summarizationConfig.model) {
            const { generateText } = await Promise.resolve().then(() => __importStar(require('ai')));
            const result = await generateText({
                model: this.summarizationConfig.model,
                prompt: fullPrompt,
                maxTokens: 500,
            });
            return result.text;
        }
        else {
            // Simple fallback
            return this.createSimpleSummary(messages, previousSummary);
        }
    }
    createSimpleSummary(messages, previousSummary) {
        const facts = [];
        messages.forEach(msg => {
            const content = typeof msg.content === 'string' ? msg.content : '';
            if (content.includes("I'm") || content.includes("I am") ||
                content.includes("My name") || content.includes("I work") ||
                content.includes("I live") || content.includes("I graduated")) {
                facts.push(content);
            }
        });
        if (previousSummary) {
            return `${previousSummary}\n\nAdditional context: ${facts.slice(0, 5).join('. ')}`;
        }
        return facts.slice(0, 10).join('. ');
    }
    async clear() {
        await Promise.all([
            this.redis.del(this.getMessagesKey()),
            this.redis.del(this.getMetadataKey())
        ]);
    }
    async getMetadata() {
        const metadataJson = await this.redis.get(this.getMetadataKey());
        if (!metadataJson) {
            return {};
        }
        return JSON.parse(metadataJson);
    }
    async updateMetadata(metadata) {
        const key = this.getMetadataKey();
        // Get existing metadata
        const existingMetadata = await this.getMetadata();
        // Merge with new metadata
        const updatedMetadata = { ...existingMetadata, ...metadata };
        // Save back to Redis with TTL
        await this.redis.setex(key, this.ttl, JSON.stringify(updatedMetadata));
    }
    /**
     * Refresh the time-to-live (TTL) for this session in Redis.
     * Useful for keeping active sessions alive.
     *
     * @returns {Promise<void>}
     */
    async refreshTTL() {
        await Promise.all([
            this.redis.expire(this.getMessagesKey(), this.ttl),
            this.redis.expire(this.getMetadataKey(), this.ttl)
        ]);
    }
}
exports.RedisSession = RedisSession;
/**
 * MongoDB-backed session storage for production use.
 * Provides durable storage with automatic message management.
 *
 * @template TContext - Type of context object
 *
 * @example
 * ```typescript
 * import { MongoClient } from 'mongodb';
 * const client = new MongoClient(mongoUrl);
 * const db = client.db('myapp');
 * const session = new DatabaseSession('user-123', {
 *   db,
 *   collectionName: 'sessions',
 *   maxMessages: 100
 * });
 * ```
 */
class DatabaseSession {
    constructor(id, config) {
        this.id = id;
        this.db = config.db;
        this.collectionName = config.collectionName || 'agent_sessions';
        this.maxMessages = config.maxMessages;
        this.summarizationConfig = config.summarization;
    }
    getCollection() {
        return this.db.collection(this.collectionName);
    }
    async getHistory() {
        const session = await this.getCollection().findOne({ sessionId: this.id });
        const messages = session?.messages || [];
        // Return as-is - AI SDK provides correct ModelMessage[] format
        return Array.isArray(messages) ? messages : [];
    }
    async addMessages(messages) {
        if (messages.length === 0)
            return;
        // Store messages as-is - AI SDK provides correct ModelMessage[] format
        const collection = this.getCollection();
        // Check if we should summarize
        if (this.summarizationConfig?.enabled) {
            // Get current count first to check threshold
            const session = await collection.findOne({ sessionId: this.id }, { projection: { messages: 1 } });
            if (session?.messages) {
                const totalMessages = session.messages.length + messages.length;
                if (totalMessages > this.summarizationConfig.messageThreshold) {
                    // Fetch, summarize, then update
                    const allMessages = [...session.messages, ...messages];
                    const summarized = await this.checkAndSummarize(allMessages);
                    await collection.updateOne({ sessionId: this.id }, {
                        $set: {
                            messages: summarized,
                            updatedAt: new Date()
                        }
                    }, { upsert: true });
                    return;
                }
            }
        }
        // Atomic operation using MongoDB's $push, $each, and $slice operators
        const updateDoc = {
            $push: {
                messages: {
                    $each: messages,
                    $position: -1, // Append at end
                }
            },
            $set: { updatedAt: new Date() },
            $setOnInsert: {
                sessionId: this.id,
                metadata: {},
                createdAt: new Date()
            }
        };
        // Apply max messages limit atomically
        if (this.maxMessages) {
            updateDoc.$push.messages.$slice = -this.maxMessages;
        }
        // Single atomic operation (no read required)
        await collection.updateOne({ sessionId: this.id }, updateDoc, { upsert: true });
    }
    async checkAndSummarize(messages) {
        if (!this.summarizationConfig)
            return messages;
        const { messageThreshold, keepRecentMessages } = this.summarizationConfig;
        // Count non-system messages (exclude existing summaries)
        const nonSystemMessages = messages.filter(msg => !(msg.role === 'system' && typeof msg.content === 'string' && msg.content.includes('Previous conversation summary')));
        // Only summarize if we exceed threshold
        if (nonSystemMessages.length <= messageThreshold) {
            return messages;
        }
        try {
            // Find existing summary (if any)
            const existingSummaryIndex = messages.findIndex(msg => msg.role === 'system' && typeof msg.content === 'string' && msg.content.includes('Previous conversation summary'));
            let existingSummary;
            if (existingSummaryIndex >= 0) {
                const summaryMsg = messages[existingSummaryIndex];
                existingSummary = typeof summaryMsg.content === 'string'
                    ? summaryMsg.content.replace('Previous conversation summary:\n', '')
                    : undefined;
                // Remove old summary
                messages.splice(existingSummaryIndex, 1);
            }
            // Messages to summarize (all except recent ones)
            const toSummarize = messages.slice(0, -keepRecentMessages);
            const recentMessages = messages.slice(-keepRecentMessages);
            // Generate summary
            const newSummary = await this.generateSummary(toSummarize, existingSummary);
            // Create summary as system message
            const summaryMessage = {
                role: 'system',
                content: `Previous conversation summary:\n${newSummary}`
            };
            // Return: [summary, recent messages]
            return [summaryMessage, ...recentMessages];
        }
        catch (_error) {
            if (process.env.NODE_ENV === 'development') {
                // Summarization failed, keep existing state
            }
            // Fallback to sliding window
            if (this.maxMessages && messages.length > this.maxMessages) {
                return messages.slice(-this.maxMessages);
            }
            return messages;
        }
    }
    async generateSummary(messages, previousSummary) {
        if (!this.summarizationConfig) {
            throw new Error('Summarization config not set');
        }
        // Build conversation text
        const conversationText = messages
            .map(msg => `${msg.role}: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`)
            .join('\n\n');
        // Use custom prompt or default
        const summaryPrompt = this.summarizationConfig.summaryPrompt ||
            `Summarize the following conversation concisely, preserving all important facts, context, and information about the user. Focus on:
- User's identity (name, job, background)
- Key facts mentioned
- Topics discussed
- Important context

Conversation:
${conversationText}

Summary (2-3 paragraphs):`;
        // If previous summary exists, include it
        const fullPrompt = previousSummary
            ? `Previous summary:\n${previousSummary}\n\n${summaryPrompt}`
            : summaryPrompt;
        // Use the provided model or create simple summary
        if (this.summarizationConfig.model) {
            const { generateText } = await Promise.resolve().then(() => __importStar(require('ai')));
            const result = await generateText({
                model: this.summarizationConfig.model,
                prompt: fullPrompt,
                maxTokens: 500,
            });
            return result.text;
        }
        else {
            // Simple fallback
            return this.createSimpleSummary(messages, previousSummary);
        }
    }
    createSimpleSummary(messages, previousSummary) {
        const facts = [];
        messages.forEach(msg => {
            const content = typeof msg.content === 'string' ? msg.content : '';
            if (content.includes("I'm") || content.includes("I am") ||
                content.includes("My name") || content.includes("I work") ||
                content.includes("I live") || content.includes("I graduated")) {
                facts.push(content);
            }
        });
        if (previousSummary) {
            return `${previousSummary}\n\nAdditional context: ${facts.slice(0, 5).join('. ')}`;
        }
        return facts.slice(0, 10).join('. ');
    }
    async clear() {
        await this.getCollection().updateOne({ sessionId: this.id }, {
            $set: {
                messages: [],
                metadata: {},
                updatedAt: new Date()
            }
        });
    }
    async getMetadata() {
        const session = await this.getCollection().findOne({ sessionId: this.id });
        return session?.metadata || {};
    }
    async updateMetadata(metadata) {
        const existingMetadata = await this.getMetadata();
        const updatedMetadata = { ...existingMetadata, ...metadata };
        await this.getCollection().updateOne({ sessionId: this.id }, {
            $set: {
                metadata: updatedMetadata,
                updatedAt: new Date()
            }
        }, { upsert: true });
    }
}
exports.DatabaseSession = DatabaseSession;
/**
 * Hybrid session storage combining Redis (fast) and MongoDB (durable).
 * Reads from Redis first, falls back to MongoDB, and syncs periodically.
 *
 * @template TContext - Type of context object
 *
 * @example
 * ```typescript
 * const session = new HybridSession('user-123', {
 *   redis,
 *   db,
 *   redisTTL: 3600,
 *   dbCollectionName: 'sessions',
 *   syncToDBInterval: 5
 * });
 * ```
 */
class HybridSession {
    constructor(id, config) {
        this.messagesSinceSync = 0;
        this.id = id;
        this.redisSession = new RedisSession(id, {
            redis: config.redis,
            keyPrefix: config.redisKeyPrefix,
            ttl: config.redisTTL,
            maxMessages: config.maxMessages,
            summarization: config.summarization
        });
        this.dbSession = new DatabaseSession(id, {
            db: config.db,
            collectionName: config.dbCollectionName,
            maxMessages: config.maxMessages,
            summarization: config.summarization
        });
        this.syncToDBInterval = config.syncToDBInterval || 5;
    }
    async getHistory() {
        // Try Redis first (fast)
        let messages = await this.redisSession.getHistory();
        if (messages.length === 0) {
            // Fallback to DB
            messages = await this.dbSession.getHistory();
            // Warm Redis cache
            if (messages.length > 0) {
                await this.redisSession.addMessages(messages);
            }
        }
        return messages;
    }
    async addMessages(messages) {
        // Always add to Redis (fast)
        await this.redisSession.addMessages(messages);
        this.messagesSinceSync += messages.length;
        // Sync to DB periodically or if threshold reached
        if (this.messagesSinceSync >= this.syncToDBInterval) {
            await this.syncToDatabase();
        }
    }
    async clear() {
        await Promise.all([
            this.redisSession.clear(),
            this.dbSession.clear()
        ]);
        this.messagesSinceSync = 0;
    }
    async getMetadata() {
        // Try Redis first
        let metadata = await this.redisSession.getMetadata();
        if (Object.keys(metadata).length === 0) {
            // Fallback to DB
            metadata = await this.dbSession.getMetadata();
            // Warm Redis cache
            if (Object.keys(metadata).length > 0) {
                await this.redisSession.updateMetadata(metadata);
            }
        }
        return metadata;
    }
    async updateMetadata(metadata) {
        await Promise.all([
            this.redisSession.updateMetadata(metadata),
            this.dbSession.updateMetadata(metadata)
        ]);
    }
    /**
     * Manually synchronize Redis cache to MongoDB database.
     * Useful for ensuring data persistence before shutdown or for backup.
     *
     * @returns {Promise<void>}
     */
    async syncToDatabase() {
        const messages = await this.redisSession.getHistory();
        const metadata = await this.redisSession.getMetadata();
        // Clear DB session first
        await this.dbSession.clear();
        // Add all messages
        if (messages.length > 0) {
            await this.dbSession.addMessages(messages);
        }
        // Update metadata
        if (Object.keys(metadata).length > 0) {
            await this.dbSession.updateMetadata(metadata);
        }
        this.messagesSinceSync = 0;
    }
}
exports.HybridSession = HybridSession;
/**
 * Session manager for creating and managing sessions of different types.
 * Provides a unified interface for session creation.
 *
 * @example
 * ```typescript
 * const manager = new SessionManager({
 *   type: 'redis',
 *   redis,
 *   maxMessages: 50
 * });
 *
 * const session = manager.getSession('user-123');
 * ```
 */
class SessionManager {
    constructor(config) {
        this.sessions = new Map();
        this.config = config;
    }
    /**
     * Get or create a session for the given session ID.
     * Sessions are cached in memory for reuse.
     *
     * @template TContext - Type of context object
     * @param {string} sessionId - Unique session identifier
     * @returns {Session<TContext>} Session instance
     * @throws {Error} If required dependencies are missing for the session type
     */
    getSession(sessionId) {
        // Check if session already exists
        if (this.sessions.has(sessionId)) {
            return this.sessions.get(sessionId);
        }
        // Create new session based on type
        let session;
        switch (this.config.type) {
            case 'memory':
                session = new MemorySession(sessionId, this.config.maxMessages, this.config.summarization);
                break;
            case 'redis':
                if (!this.config.redis) {
                    throw new Error('Redis instance required for redis session type');
                }
                session = new RedisSession(sessionId, {
                    redis: this.config.redis,
                    keyPrefix: this.config.redisKeyPrefix,
                    ttl: this.config.redisTTL,
                    maxMessages: this.config.maxMessages,
                    summarization: this.config.summarization
                });
                break;
            case 'database':
                if (!this.config.db) {
                    throw new Error('Database instance required for database session type');
                }
                session = new DatabaseSession(sessionId, {
                    db: this.config.db,
                    collectionName: this.config.dbCollectionName,
                    maxMessages: this.config.maxMessages,
                    summarization: this.config.summarization
                });
                break;
            case 'hybrid':
                if (!this.config.redis || !this.config.db) {
                    throw new Error('Both Redis and Database required for hybrid session type');
                }
                session = new HybridSession(sessionId, {
                    redis: this.config.redis,
                    db: this.config.db,
                    redisKeyPrefix: this.config.redisKeyPrefix,
                    redisTTL: this.config.redisTTL,
                    dbCollectionName: this.config.dbCollectionName,
                    maxMessages: this.config.maxMessages,
                    syncToDBInterval: this.config.syncToDBInterval,
                    summarization: this.config.summarization
                });
                break;
            default:
                throw new Error(`Unknown session type: ${this.config.type}`);
        }
        this.sessions.set(sessionId, session);
        return session;
    }
    /**
     * Delete a session and clear its data from storage.
     *
     * @param {string} sessionId - Session ID to delete
     * @returns {Promise<void>}
     */
    async deleteSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            await session.clear();
            this.sessions.delete(sessionId);
        }
    }
    /**
     * Clear all cached session instances from memory.
     * Does not clear session data from storage (Redis/MongoDB).
     *
     * @returns {void}
     */
    clearCache() {
        this.sessions.clear();
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=session.js.map
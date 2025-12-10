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
import type { ModelMessage } from 'ai';
import type { Session } from '../core/agent';
import { Redis } from 'ioredis';
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
export declare class MemorySession<TContext = any> implements Session<TContext> {
    readonly id: string;
    private messages;
    private metadata;
    private maxMessages?;
    private summarizationConfig?;
    /**
     * Create a new in-memory session.
     *
     * @param {string} id - Unique session identifier
     * @param {number} [maxMessages] - Maximum number of messages to keep (sliding window)
     * @param {SummarizationConfig} [summarizationConfig] - Optional auto-summarization config
     */
    constructor(id: string, maxMessages?: number, summarizationConfig?: SummarizationConfig);
    getHistory(): Promise<ModelMessage[]>;
    addMessages(messages: ModelMessage[]): Promise<void>;
    private checkAndSummarize;
    private generateSummary;
    private createSimpleSummary;
    clear(): Promise<void>;
    getMetadata(): Promise<Record<string, any>>;
    updateMetadata(metadata: Record<string, any>): Promise<void>;
}
/**
 * Configuration for Redis-backed session storage.
 *
 * @property {Redis} redis - Redis client instance
 * @property {string} [keyPrefix] - Prefix for Redis keys (default: 'agent:session:')
 * @property {number} [ttl] - Time to live in seconds (default: 3600)
 * @property {number} [maxMessages] - Maximum number of messages to keep
 * @property {SummarizationConfig} [summarization] - Optional auto-summarization config
 */
export interface RedisSessionConfig {
    redis: Redis;
    keyPrefix?: string;
    ttl?: number;
    maxMessages?: number;
    summarization?: SummarizationConfig;
}
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
export declare class RedisSession<TContext = any> implements Session<TContext> {
    readonly id: string;
    private redis;
    private keyPrefix;
    private ttl;
    private maxMessages?;
    private summarizationConfig?;
    constructor(id: string, config: RedisSessionConfig);
    private getMessagesKey;
    private getMetadataKey;
    getHistory(): Promise<ModelMessage[]>;
    addMessages(messages: ModelMessage[]): Promise<void>;
    private checkAndSummarize;
    private generateSummary;
    private createSimpleSummary;
    clear(): Promise<void>;
    getMetadata(): Promise<Record<string, any>>;
    updateMetadata(metadata: Record<string, any>): Promise<void>;
    /**
     * Refresh the time-to-live (TTL) for this session in Redis.
     * Useful for keeping active sessions alive.
     *
     * @returns {Promise<void>}
     */
    refreshTTL(): Promise<void>;
}
/**
 * Configuration for MongoDB-backed session storage.
 *
 * @property {any} db - MongoDB Database instance
 * @property {string} [collectionName] - Collection name for sessions (default: 'agent_sessions')
 * @property {number} [maxMessages] - Maximum number of messages to keep
 * @property {SummarizationConfig} [summarization] - Optional auto-summarization config
 */
export interface DatabaseSessionConfig {
    db: any;
    collectionName?: string;
    maxMessages?: number;
    summarization?: SummarizationConfig;
}
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
export declare class DatabaseSession<TContext = any> implements Session<TContext> {
    readonly id: string;
    private db;
    private collectionName;
    private maxMessages?;
    private summarizationConfig?;
    constructor(id: string, config: DatabaseSessionConfig);
    private getCollection;
    getHistory(): Promise<ModelMessage[]>;
    addMessages(messages: ModelMessage[]): Promise<void>;
    private checkAndSummarize;
    private generateSummary;
    private createSimpleSummary;
    clear(): Promise<void>;
    getMetadata(): Promise<Record<string, any>>;
    updateMetadata(metadata: Record<string, any>): Promise<void>;
}
/**
 * Configuration for hybrid (Redis + MongoDB) session storage.
 *
 * @property {Redis} redis - Redis client for fast caching
 * @property {any} db - MongoDB Database instance for durable storage
 * @property {string} [redisKeyPrefix] - Prefix for Redis keys
 * @property {number} [redisTTL] - Redis TTL in seconds
 * @property {string} [dbCollectionName] - MongoDB collection name
 * @property {number} [maxMessages] - Maximum number of messages to keep
 * @property {number} [syncToDBInterval] - Sync to DB every N messages (default: 5)
 * @property {SummarizationConfig} [summarization] - Optional auto-summarization config
 */
export interface HybridSessionConfig {
    redis: Redis;
    db: any;
    redisKeyPrefix?: string;
    redisTTL?: number;
    dbCollectionName?: string;
    maxMessages?: number;
    syncToDBInterval?: number;
    summarization?: SummarizationConfig;
}
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
export declare class HybridSession<TContext = any> implements Session<TContext> {
    readonly id: string;
    private redisSession;
    private dbSession;
    private syncToDBInterval;
    private messagesSinceSync;
    constructor(id: string, config: HybridSessionConfig);
    getHistory(): Promise<ModelMessage[]>;
    addMessages(messages: ModelMessage[]): Promise<void>;
    clear(): Promise<void>;
    getMetadata(): Promise<Record<string, any>>;
    updateMetadata(metadata: Record<string, any>): Promise<void>;
    /**
     * Manually synchronize Redis cache to MongoDB database.
     * Useful for ensuring data persistence before shutdown or for backup.
     *
     * @returns {Promise<void>}
     */
    syncToDatabase(): Promise<void>;
}
/**
 * Configuration for automatic conversation summarization.
 *
 * @property {boolean} enabled - Enable auto-summarization
 * @property {number} messageThreshold - Trigger summarization when message count exceeds this
 * @property {number} keepRecentMessages - Number of recent messages to keep verbatim (default: 3)
 * @property {any} [model] - Model to use for summarization (optional)
 * @property {string} [summaryPrompt] - Custom system prompt for summarization
 */
export interface SummarizationConfig {
    /** Enable auto-summarization */
    enabled: boolean;
    /** Trigger summarization when message count exceeds this */
    messageThreshold: number;
    /** Number of recent messages to keep verbatim */
    keepRecentMessages: number;
    /** Model to use for summarization (optional, uses default if not set) */
    model?: any;
    /** System prompt for summarization */
    summaryPrompt?: string;
}
/**
 * Configuration for SessionManager.
 *
 * @property {'memory' | 'redis' | 'database' | 'hybrid'} type - Session storage type
 * @property {Redis} [redis] - Redis client (required for redis/hybrid types)
 * @property {any} [db] - MongoDB Database instance (required for database/hybrid types)
 * @property {string} [redisKeyPrefix] - Prefix for Redis keys
 * @property {number} [redisTTL] - Redis TTL in seconds
 * @property {string} [dbCollectionName] - MongoDB collection name
 * @property {number} [maxMessages] - Maximum messages per session
 * @property {number} [syncToDBInterval] - Sync interval for hybrid sessions
 * @property {SummarizationConfig} [summarization] - Auto-summarization config
 */
export interface SessionManagerConfig {
    type: 'memory' | 'redis' | 'database' | 'hybrid';
    redis?: Redis;
    db?: any;
    redisKeyPrefix?: string;
    redisTTL?: number;
    dbCollectionName?: string;
    maxMessages?: number;
    syncToDBInterval?: number;
    /** Auto-summarization configuration */
    summarization?: SummarizationConfig;
}
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
export declare class SessionManager {
    private config;
    private sessions;
    constructor(config: SessionManagerConfig);
    /**
     * Get or create a session for the given session ID.
     * Sessions are cached in memory for reuse.
     *
     * @template TContext - Type of context object
     * @param {string} sessionId - Unique session identifier
     * @returns {Session<TContext>} Session instance
     * @throws {Error} If required dependencies are missing for the session type
     */
    getSession<TContext = any>(sessionId: string): Session<TContext>;
    /**
     * Delete a session and clear its data from storage.
     *
     * @param {string} sessionId - Session ID to delete
     * @returns {Promise<void>}
     */
    deleteSession(sessionId: string): Promise<void>;
    /**
     * Clear all cached session instances from memory.
     * Does not clear session data from storage (Redis/MongoDB).
     *
     * @returns {void}
     */
    clearCache(): void;
}
//# sourceMappingURL=session.d.ts.map
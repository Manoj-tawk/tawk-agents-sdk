/**
 * Enhanced Model Context Protocol (MCP) Support
 *
 * Provides native agent-level MCP integration with:
 * - Automatic tool fetching
 * - Lifecycle management
 * - Connection pooling
 * - Tool caching
 * - HTTP and stdio transports
 */
import { z } from 'zod';
type CoreTool = {
    description?: string;
    inputSchema?: z.ZodSchema<any>;
    execute: (args: any, context?: any) => Promise<any> | any;
    enabled?: boolean | ((context: any) => boolean | Promise<boolean>);
};
export interface MCPServerConfig {
    /**
     * Unique name for this MCP server
     */
    name: string;
    /**
     * Transport type
     */
    transport: 'stdio' | 'http';
    /**
     * For stdio transport: command to spawn
     */
    command?: string;
    /**
     * For stdio transport: command arguments
     */
    args?: string[];
    /**
     * For HTTP transport: server URL
     */
    url?: string;
    /**
     * Authentication config
     */
    auth?: {
        type: 'bearer' | 'basic';
        token?: string;
        username?: string;
        password?: string;
    };
    /**
     * Environment variables
     */
    env?: Record<string, string>;
    /**
     * Filter specific tools (if not set, all tools are available)
     */
    tools?: string[];
    /**
     * Capabilities to request
     */
    capabilities?: ('tools' | 'resources' | 'prompts')[];
    /**
     * Auto-connect on registration
     */
    autoConnect?: boolean;
    /**
     * Auto-refresh tool list interval (ms)
     */
    autoRefreshInterval?: number;
    /**
     * Connection timeout (ms)
     */
    connectionTimeout?: number;
}
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: any;
}
export interface MCPResource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
}
export interface MCPPrompt {
    name: string;
    description?: string;
    arguments?: any[];
}
export declare class EnhancedMCPServer {
    private config;
    private process?;
    private tools;
    private resources;
    private prompts;
    private messageId;
    private pendingRequests;
    private connected;
    private refreshInterval?;
    private toolCache?;
    private cacheTimestamp?;
    private readonly CACHE_TTL;
    constructor(config: MCPServerConfig);
    /**
     * Connect to the MCP server
     */
    connect(): Promise<void>;
    /**
     * Disconnect from the MCP server
     */
    disconnect(): Promise<void>;
    /**
     * Check if server is connected
     */
    isConnected(): boolean;
    /**
     * Get tools from this server
     */
    getTools(): Promise<MCPTool[]>;
    /**
     * Get tools as CoreTool format (cached)
     */
    getCoreTools(): Promise<CoreTool[]>;
    /**
     * Refresh tool list
     */
    refreshTools(): Promise<void>;
    /**
     * Execute a tool
     */
    executeTool(toolName: string, args: any): Promise<any>;
    /**
     * Get resources (if supported)
     */
    getResources(): Promise<MCPResource[]>;
    /**
     * Get prompts (if supported)
     */
    getPrompts(): Promise<MCPPrompt[]>;
    /**
     * Start auto-refresh of tools
     */
    private startAutoRefresh;
    /**
     * Connect via stdio
     */
    private connectStdio;
    /**
     * Connect via HTTP
     */
    private connectHttp;
    /**
     * Send a request to the MCP server
     */
    private sendRequest;
    /**
     * Send a request via stdio
     */
    private stdioRequest;
    /**
     * Send a request via HTTP
     */
    private httpRequest;
    /**
     * Handle a message from stdio
     */
    private handleMessage;
    /**
     * Convert JSON Schema to Zod schema
     */
    private convertInputSchemaToZod;
}
export declare class EnhancedMCPServerManager {
    private servers;
    /**
     * Register an MCP server
     */
    registerServer(config: MCPServerConfig): Promise<void>;
    /**
     * Get a registered server
     */
    getServer(name: string): EnhancedMCPServer | undefined;
    /**
     * Get all tools from all servers
     */
    getAllTools(): Promise<Record<string, CoreTool>>;
    /**
     * Get tools from a specific server
     */
    getServerTools(serverName: string): Promise<Record<string, CoreTool>>;
    /**
     * Refresh all tool lists
     */
    refreshAll(): Promise<void>;
    /**
     * Shutdown all servers
     */
    shutdown(): Promise<void>;
    /**
     * Get server count
     */
    getServerCount(): number;
    /**
     * Get server names
     */
    getServerNames(): string[];
}
export declare function getGlobalMCPManager(): EnhancedMCPServerManager;
export declare function registerMCPServer(config: MCPServerConfig): Promise<void>;
export declare function getMCPTools(): Promise<Record<string, CoreTool>>;
export declare function shutdownMCPServers(): Promise<void>;
export {};
//# sourceMappingURL=enhanced.d.ts.map
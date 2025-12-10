/**
 * Model Context Protocol (MCP) Support
 *
 * Allows agents to use MCP servers for additional tools and context
 */
import type { MCPServerConfig, ToolDefinition } from '../types/types';
/**
 * Manager for Model Context Protocol (MCP) servers.
 * Handles registration, tool discovery, and server lifecycle.
 *
 * @example
 * ```typescript
 * const manager = new MCPServerManager();
 * await manager.registerServer({
 *   name: 'filesystem',
 *   command: 'npx',
 *   args: ['-y', '@modelcontextprotocol/server-filesystem']
 * });
 *
 * const tools = await manager.getTools();
 * ```
 */
export declare class MCPServerManager {
    private servers;
    /**
     * Register and start an MCP server.
     *
     * @param {MCPServerConfig} config - MCP server configuration
     * @returns {Promise<void>}
     * @throws {Error} If server fails to start
     */
    registerServer(config: MCPServerConfig): Promise<void>;
    /**
     * Get all tools from all registered MCP servers.
     * Tool names are prefixed with server name (e.g., 'filesystem_read_file').
     *
     * @returns {Promise<Record<string, ToolDefinition>>} Dictionary of tool definitions
     */
    getTools(): Promise<Record<string, ToolDefinition>>;
    /**
     * Get tools from a specific MCP server.
     *
     * @param {string} serverName - Name of the registered server
     * @returns {Promise<Record<string, ToolDefinition>>} Dictionary of tool definitions
     * @throws {Error} If server is not found
     */
    getServerTools(serverName: string): Promise<Record<string, ToolDefinition>>;
    /**
     * Shutdown all registered MCP servers and clean up resources.
     *
     * @returns {Promise<void>}
     */
    shutdown(): Promise<void>;
    /**
     * Convert JSON Schema to Zod schema (simplified)
     */
    private convertInputSchemaToZod;
}
/**
 * Get or create the global MCP server manager instance.
 *
 * @returns {MCPServerManager} Global MCP server manager
 */
export declare function getGlobalMCPManager(): MCPServerManager;
/**
 * Register an MCP server using the global manager.
 *
 * @param {MCPServerConfig} config - MCP server configuration
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await registerMCPServer({
 *   name: 'filesystem',
 *   command: 'npx',
 *   args: ['-y', '@modelcontextprotocol/server-filesystem']
 * });
 * ```
 */
export declare function registerMCPServer(config: MCPServerConfig): Promise<void>;
/**
 * Get all tools from all registered MCP servers.
 *
 * @returns {Promise<Record<string, ToolDefinition>>} Dictionary of tool definitions
 *
 * @example
 * ```typescript
 * const tools = await getMCPTools();
 * const agent = new Agent({
 *   tools: { ...tools }
 * });
 * ```
 */
export declare function getMCPTools(): Promise<Record<string, ToolDefinition>>;
/**
 * Shutdown all registered MCP servers.
 *
 * @returns {Promise<void>}
 */
export declare function shutdownMCPServers(): Promise<void>;
//# sourceMappingURL=index.d.ts.map
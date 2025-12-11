"use strict";
/**
 * Model Context Protocol (MCP) Support
 *
 * Allows agents to use MCP servers for additional tools and context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServerManager = void 0;
exports.getGlobalMCPManager = getGlobalMCPManager;
exports.registerMCPServer = registerMCPServer;
exports.getMCPTools = getMCPTools;
exports.shutdownMCPServers = shutdownMCPServers;
const zod_1 = require("zod");
const child_process_1 = require("child_process");
// ============================================
// MCP SERVER MANAGER
// ============================================
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
class MCPServerManager {
    constructor() {
        this.servers = new Map();
    }
    /**
     * Register and start an MCP server.
     *
     * @param {MCPServerConfig} config - MCP server configuration
     * @returns {Promise<void>}
     * @throws {Error} If server fails to start
     */
    async registerServer(config) {
        const server = new MCPServer(config);
        await server.start();
        this.servers.set(config.name, server);
    }
    /**
     * Get all tools from all registered MCP servers.
     * Tool names are prefixed with server name (e.g., 'filesystem_read_file').
     *
     * @returns {Promise<Record<string, ToolDefinition>>} Dictionary of tool definitions
     */
    async getTools() {
        const tools = {};
        for (const [serverName, server] of this.servers) {
            const serverTools = await server.getTools();
            for (const mcpTool of serverTools) {
                const toolName = `${serverName}_${mcpTool.name}`;
                tools[toolName] = {
                    description: mcpTool.description,
                    parameters: this.convertInputSchemaToZod(mcpTool.inputSchema),
                    execute: async (args) => {
                        return await server.executeTool(mcpTool.name, args);
                    },
                    mcpServer: serverName,
                };
            }
        }
        return tools;
    }
    /**
     * Get tools from a specific MCP server.
     *
     * @param {string} serverName - Name of the registered server
     * @returns {Promise<Record<string, ToolDefinition>>} Dictionary of tool definitions
     * @throws {Error} If server is not found
     */
    async getServerTools(serverName) {
        const server = this.servers.get(serverName);
        if (!server) {
            throw new Error(`MCP server not found: ${serverName}`);
        }
        const tools = {};
        const serverTools = await server.getTools();
        for (const mcpTool of serverTools) {
            const toolName = `${serverName}_${mcpTool.name}`;
            tools[toolName] = {
                description: mcpTool.description,
                parameters: this.convertInputSchemaToZod(mcpTool.inputSchema),
                execute: async (args) => {
                    return await server.executeTool(mcpTool.name, args);
                },
                mcpServer: serverName,
            };
        }
        return tools;
    }
    /**
     * Shutdown all registered MCP servers and clean up resources.
     *
     * @returns {Promise<void>}
     */
    async shutdown() {
        for (const server of this.servers.values()) {
            await server.stop();
        }
        this.servers.clear();
    }
    /**
     * Convert JSON Schema to Zod schema (simplified)
     */
    convertInputSchemaToZod(schema) {
        if (!schema || !schema.properties) {
            return zod_1.z.object({});
        }
        const shape = {};
        for (const [key, value] of Object.entries(schema.properties)) {
            const prop = value;
            if (prop.type === 'string') {
                shape[key] = zod_1.z.string();
            }
            else if (prop.type === 'number') {
                shape[key] = zod_1.z.number();
            }
            else if (prop.type === 'boolean') {
                shape[key] = zod_1.z.boolean();
            }
            else if (prop.type === 'object') {
                shape[key] = zod_1.z.object({});
            }
            else if (prop.type === 'array') {
                shape[key] = zod_1.z.array(zod_1.z.any());
            }
            else {
                shape[key] = zod_1.z.any();
            }
            if (prop.description) {
                shape[key] = shape[key].describe(prop.description);
            }
            if (!schema.required?.includes(key)) {
                shape[key] = shape[key].optional();
            }
        }
        return zod_1.z.object(shape);
    }
}
exports.MCPServerManager = MCPServerManager;
// ============================================
// MCP SERVER (Internal)
// ============================================
class MCPServer {
    constructor(config) {
        this.config = config;
        this.tools = [];
        this.messageId = 0;
        this.pendingRequests = new Map();
    }
    async start() {
        return new Promise((resolve, reject) => {
            this.process = (0, child_process_1.spawn)(this.config.command, this.config.args || [], {
                env: { ...process.env, ...this.config.env },
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            if (!this.process.stdin || !this.process.stdout) {
                reject(new Error('Failed to create MCP server process'));
                return;
            }
            // Handle stdout (responses from MCP server)
            let buffer = '';
            this.process.stdout.on('data', (data) => {
                buffer += data.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const message = JSON.parse(line);
                            this.handleMessage(message);
                        }
                        catch (error) {
                            console.error('Failed to parse MCP message:', error);
                        }
                    }
                }
            });
            this.process.on('error', (error) => {
                reject(error);
            });
            // Initialize - list tools
            this.sendRequest('tools/list', {}).then((response) => {
                this.tools = response.tools || [];
                resolve();
            }).catch(reject);
        });
    }
    async stop() {
        if (this.process) {
            this.process.kill();
            this.process = undefined;
        }
    }
    async getTools() {
        // Filter by config if specified
        if (this.config.tools && this.config.tools.length > 0) {
            return this.tools.filter(t => this.config.tools.includes(t.name));
        }
        return this.tools;
    }
    async executeTool(toolName, args) {
        const response = await this.sendRequest('tools/call', {
            name: toolName,
            arguments: args,
        });
        return response.result;
    }
    async sendRequest(method, params) {
        const id = ++this.messageId;
        const message = {
            jsonrpc: '2.0',
            id,
            method,
            params,
        };
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            if (this.process && this.process.stdin) {
                this.process.stdin.write(JSON.stringify(message) + '\n');
            }
            else {
                reject(new Error('MCP server not running'));
            }
            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`MCP request timeout: ${method}`));
                }
            }, 30000);
        });
    }
    handleMessage(message) {
        if (message.id && this.pendingRequests.has(message.id)) {
            const pending = this.pendingRequests.get(message.id);
            this.pendingRequests.delete(message.id);
            if (message.error) {
                pending.reject(new Error(message.error.message || 'MCP error'));
            }
            else {
                pending.resolve(message.result);
            }
        }
    }
}
// ============================================
// GLOBAL MCP MANAGER
// ============================================
let globalMCPManager = null;
/**
 * Get or create the global MCP server manager instance.
 *
 * @returns {MCPServerManager} Global MCP server manager
 */
function getGlobalMCPManager() {
    if (!globalMCPManager) {
        globalMCPManager = new MCPServerManager();
    }
    return globalMCPManager;
}
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
async function registerMCPServer(config) {
    const manager = getGlobalMCPManager();
    await manager.registerServer(config);
}
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
async function getMCPTools() {
    const manager = getGlobalMCPManager();
    return await manager.getTools();
}
/**
 * Shutdown all registered MCP servers.
 *
 * @returns {Promise<void>}
 */
async function shutdownMCPServers() {
    if (globalMCPManager) {
        await globalMCPManager.shutdown();
        globalMCPManager = null;
    }
}
//# sourceMappingURL=index.js.map
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedMCPServerManager = exports.EnhancedMCPServer = void 0;
exports.getGlobalMCPManager = getGlobalMCPManager;
exports.registerMCPServer = registerMCPServer;
exports.getMCPTools = getMCPTools;
exports.shutdownMCPServers = shutdownMCPServers;
const zod_1 = require("zod");
const child_process_1 = require("child_process");
// ============================================
// ENHANCED MCP SERVER
// ============================================
class EnhancedMCPServer {
    constructor(config) {
        this.config = config;
        this.tools = [];
        this.resources = [];
        this.prompts = [];
        this.messageId = 0;
        this.pendingRequests = new Map();
        this.connected = false;
        this.CACHE_TTL = 60000; // 1 minute
    }
    /**
     * Connect to the MCP server
     */
    async connect() {
        if (this.connected) {
            return;
        }
        if (this.config.transport === 'stdio') {
            await this.connectStdio();
        }
        else if (this.config.transport === 'http') {
            await this.connectHttp();
        }
        else {
            throw new Error(`Unknown transport: ${this.config.transport}`);
        }
        // Start auto-refresh if configured
        if (this.config.autoRefreshInterval) {
            this.startAutoRefresh(this.config.autoRefreshInterval);
        }
        this.connected = true;
    }
    /**
     * Disconnect from the MCP server
     */
    async disconnect() {
        if (!this.connected) {
            return;
        }
        // Stop auto-refresh
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = undefined;
        }
        // Cancel pending requests
        for (const [_id, pending] of this.pendingRequests.entries()) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Server disconnected'));
        }
        this.pendingRequests.clear();
        // Kill process if stdio
        if (this.process) {
            this.process.kill();
            this.process = undefined;
        }
        this.connected = false;
        this.toolCache = undefined;
        this.cacheTimestamp = undefined;
    }
    /**
     * Check if server is connected
     */
    isConnected() {
        return this.connected;
    }
    /**
     * Get tools from this server
     */
    async getTools() {
        if (!this.connected) {
            await this.connect();
        }
        // Apply filter if configured
        if (this.config.tools && this.config.tools.length > 0) {
            return this.tools.filter((t) => this.config.tools.includes(t.name));
        }
        return this.tools;
    }
    /**
     * Get tools as CoreTool format (cached)
     */
    async getCoreTools() {
        // Check cache
        if (this.toolCache &&
            this.cacheTimestamp &&
            Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
            return Array.from(this.toolCache.values());
        }
        // Fetch and convert
        const mcpTools = await this.getTools();
        const coreTools = [];
        for (const mcpTool of mcpTools) {
            const coreTool = {
                description: mcpTool.description,
                inputSchema: this.convertInputSchemaToZod(mcpTool.inputSchema),
                execute: async (args) => {
                    return await this.executeTool(mcpTool.name, args);
                },
            };
            coreTools.push(coreTool);
        }
        // Update cache
        this.toolCache = new Map(coreTools.map((t, i) => [mcpTools[i].name, t]));
        this.cacheTimestamp = Date.now();
        return coreTools;
    }
    /**
     * Refresh tool list
     */
    async refreshTools() {
        if (!this.connected) {
            return;
        }
        const response = await this.sendRequest('tools/list', {});
        this.tools = response.tools || [];
        // Invalidate cache
        this.toolCache = undefined;
        this.cacheTimestamp = undefined;
    }
    /**
     * Execute a tool
     */
    async executeTool(toolName, args) {
        if (!this.connected) {
            await this.connect();
        }
        const response = await this.sendRequest('tools/call', {
            name: toolName,
            arguments: args,
        });
        return response.result;
    }
    /**
     * Get resources (if supported)
     */
    async getResources() {
        if (!this.connected) {
            await this.connect();
        }
        try {
            const response = await this.sendRequest('resources/list', {});
            this.resources = response.resources || [];
            return this.resources;
        }
        catch (_error) {
            // Resources might not be supported
            return [];
        }
    }
    /**
     * Get prompts (if supported)
     */
    async getPrompts() {
        if (!this.connected) {
            await this.connect();
        }
        try {
            const response = await this.sendRequest('prompts/list', {});
            this.prompts = response.prompts || [];
            return this.prompts;
        }
        catch (_error) {
            // Prompts might not be supported
            return [];
        }
    }
    /**
     * Start auto-refresh of tools
     */
    startAutoRefresh(interval) {
        this.refreshInterval = setInterval(() => {
            this.refreshTools().catch((error) => {
                console.error(`MCP auto-refresh error (${this.config.name}):`, error);
            });
        }, interval);
    }
    /**
     * Connect via stdio
     */
    async connectStdio() {
        if (!this.config.command) {
            throw new Error('command is required for stdio transport');
        }
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Connection timeout (${this.config.connectionTimeout || 10000}ms)`));
            }, this.config.connectionTimeout || 10000);
            this.process = (0, child_process_1.spawn)(this.config.command, this.config.args || [], {
                env: { ...process.env, ...this.config.env },
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            if (!this.process.stdin || !this.process.stdout) {
                clearTimeout(timeout);
                reject(new Error('Failed to create MCP server process'));
                return;
            }
            // Handle stdout
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
            // Handle errors
            this.process.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
            // Initialize - list tools
            this.sendRequest('tools/list', {})
                .then((response) => {
                this.tools = response.tools || [];
                clearTimeout(timeout);
                resolve();
            })
                .catch((error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }
    /**
     * Connect via HTTP
     */
    async connectHttp() {
        if (!this.config.url) {
            throw new Error('url is required for http transport');
        }
        // Test connection and list tools
        const response = await this.httpRequest('tools/list', {});
        this.tools = response.tools || [];
    }
    /**
     * Send a request to the MCP server
     */
    async sendRequest(method, params) {
        if (this.config.transport === 'http') {
            return this.httpRequest(method, params);
        }
        else {
            return this.stdioRequest(method, params);
        }
    }
    /**
     * Send a request via stdio
     */
    async stdioRequest(method, params) {
        const id = ++this.messageId;
        const message = {
            jsonrpc: '2.0',
            id,
            method,
            params,
        };
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`MCP request timeout: ${method}`));
                }
            }, this.config.connectionTimeout || 30000);
            this.pendingRequests.set(id, { resolve, reject, timeout });
            if (this.process && this.process.stdin) {
                this.process.stdin.write(JSON.stringify(message) + '\n');
            }
            else {
                clearTimeout(timeout);
                reject(new Error('MCP server not running'));
            }
        });
    }
    /**
     * Send a request via HTTP
     */
    async httpRequest(method, params) {
        const headers = {
            'Content-Type': 'application/json',
        };
        // Add authentication
        if (this.config.auth) {
            if (this.config.auth.type === 'bearer' && this.config.auth.token) {
                headers['Authorization'] = `Bearer ${this.config.auth.token}`;
            }
            else if (this.config.auth.type === 'basic' &&
                this.config.auth.username &&
                this.config.auth.password) {
                const credentials = Buffer.from(`${this.config.auth.username}:${this.config.auth.password}`).toString('base64');
                headers['Authorization'] = `Basic ${credentials}`;
            }
        }
        const response = await fetch(this.config.url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: ++this.messageId,
                method,
                params,
            }),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message || 'MCP error');
        }
        return data.result;
    }
    /**
     * Handle a message from stdio
     */
    handleMessage(message) {
        if (message.id && this.pendingRequests.has(message.id)) {
            const pending = this.pendingRequests.get(message.id);
            this.pendingRequests.delete(message.id);
            clearTimeout(pending.timeout);
            if (message.error) {
                pending.reject(new Error(message.error.message || 'MCP error'));
            }
            else {
                pending.resolve(message.result);
            }
        }
    }
    /**
     * Convert JSON Schema to Zod schema
     */
    convertInputSchemaToZod(schema) {
        if (!schema || !schema.properties) {
            return zod_1.z.object({});
        }
        const shape = {};
        for (const [key, value] of Object.entries(schema.properties)) {
            const prop = value;
            let zodType;
            if (prop.type === 'string') {
                zodType = zod_1.z.string();
            }
            else if (prop.type === 'number' || prop.type === 'integer') {
                zodType = zod_1.z.number();
            }
            else if (prop.type === 'boolean') {
                zodType = zod_1.z.boolean();
            }
            else if (prop.type === 'object') {
                zodType = prop.properties
                    ? this.convertInputSchemaToZod(prop)
                    : zod_1.z.object({});
            }
            else if (prop.type === 'array') {
                zodType = zod_1.z.array(zod_1.z.any());
            }
            else {
                zodType = zod_1.z.any();
            }
            if (prop.description) {
                zodType = zodType.describe(prop.description);
            }
            if (prop.default !== undefined) {
                zodType = zodType.default(prop.default);
            }
            if (!schema.required?.includes(key)) {
                zodType = zodType.optional();
            }
            shape[key] = zodType;
        }
        return zod_1.z.object(shape);
    }
}
exports.EnhancedMCPServer = EnhancedMCPServer;
// ============================================
// ENHANCED MCP SERVER MANAGER
// ============================================
class EnhancedMCPServerManager {
    constructor() {
        this.servers = new Map();
    }
    /**
     * Register an MCP server
     */
    async registerServer(config) {
        if (this.servers.has(config.name)) {
            throw new Error(`MCP server already registered: ${config.name}`);
        }
        const server = new EnhancedMCPServer(config);
        if (config.autoConnect !== false) {
            await server.connect();
        }
        this.servers.set(config.name, server);
    }
    /**
     * Get a registered server
     */
    getServer(name) {
        return this.servers.get(name);
    }
    /**
     * Get all tools from all servers
     */
    async getAllTools() {
        const tools = {};
        for (const [serverName, server] of this.servers) {
            const serverTools = await server.getCoreTools();
            const mcpTools = await server.getTools();
            for (let i = 0; i < serverTools.length; i++) {
                const toolName = `${serverName}_${mcpTools[i].name}`;
                tools[toolName] = serverTools[i];
            }
        }
        return tools;
    }
    /**
     * Get tools from a specific server
     */
    async getServerTools(serverName) {
        const server = this.servers.get(serverName);
        if (!server) {
            throw new Error(`MCP server not found: ${serverName}`);
        }
        const tools = {};
        const serverTools = await server.getCoreTools();
        const mcpTools = await server.getTools();
        for (let i = 0; i < serverTools.length; i++) {
            const toolName = `${serverName}_${mcpTools[i].name}`;
            tools[toolName] = serverTools[i];
        }
        return tools;
    }
    /**
     * Refresh all tool lists
     */
    async refreshAll() {
        await Promise.all(Array.from(this.servers.values()).map((server) => server.refreshTools()));
    }
    /**
     * Shutdown all servers
     */
    async shutdown() {
        await Promise.all(Array.from(this.servers.values()).map((server) => server.disconnect()));
        this.servers.clear();
    }
    /**
     * Get server count
     */
    getServerCount() {
        return this.servers.size;
    }
    /**
     * Get server names
     */
    getServerNames() {
        return Array.from(this.servers.keys());
    }
}
exports.EnhancedMCPServerManager = EnhancedMCPServerManager;
// ============================================
// GLOBAL MANAGER
// ============================================
let globalManager = null;
function getGlobalMCPManager() {
    if (!globalManager) {
        globalManager = new EnhancedMCPServerManager();
    }
    return globalManager;
}
async function registerMCPServer(config) {
    const manager = getGlobalMCPManager();
    await manager.registerServer(config);
}
async function getMCPTools() {
    const manager = getGlobalMCPManager();
    return await manager.getAllTools();
}
async function shutdownMCPServers() {
    if (globalManager) {
        await globalManager.shutdown();
        globalManager = null;
    }
}
//# sourceMappingURL=enhanced.js.map
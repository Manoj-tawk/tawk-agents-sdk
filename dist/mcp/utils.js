"use strict";
/**
 * MCP Utility Functions
 *
 * Helper functions for MCP server integration.
 *
 * @module mcp-utils
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterMCPTools = filterMCPTools;
exports.createMCPToolStaticFilter = createMCPToolStaticFilter;
exports.mcpToFunctionTool = mcpToFunctionTool;
exports.normalizeMCPToolName = normalizeMCPToolName;
exports.groupMCPToolsByServer = groupMCPToolsByServer;
const zod_1 = require("zod");
/**
 * Apply filter to MCP tools
 */
function filterMCPTools(tools, filter) {
    let filtered = [...tools];
    // Include filter
    if (filter.includeTools && filter.includeTools.length > 0) {
        filtered = filtered.filter(t => filter.includeTools.includes(t.name));
    }
    // Exclude filter
    if (filter.excludeTools && filter.excludeTools.length > 0) {
        filtered = filtered.filter(t => !filter.excludeTools.includes(t.name));
    }
    // Pattern filter
    if (filter.pattern) {
        filtered = filtered.filter(t => filter.pattern.test(t.name));
    }
    return filtered;
}
/**
 * Create static filter for MCP tools
 */
function createMCPToolStaticFilter(config) {
    return {
        includeTools: config.allowedTools,
        excludeTools: config.blockedTools,
    };
}
/**
 * Convert MCP tool to function tool definition
 */
function mcpToFunctionTool(mcpTool) {
    return {
        description: mcpTool.description,
        parameters: convertMCPSchemaToZod(mcpTool.inputSchema),
        execute: async (_args) => {
            // This would call the MCP server
            // Implementation depends on MCP server integration
            throw new Error('MCP tool execution not implemented');
        },
        mcpServer: mcpTool.serverName,
    };
}
/**
 * Convert JSON schema to Zod schema (simplified)
 */
function convertMCPSchemaToZod(schema) {
    if (!schema || !schema.properties) {
        return zod_1.z.object({});
    }
    const shape = {};
    for (const [key, value] of Object.entries(schema.properties || {})) {
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
        else if (prop.type === 'array') {
            shape[key] = zod_1.z.array(zod_1.z.any());
        }
        else if (prop.type === 'object') {
            shape[key] = zod_1.z.object({});
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
/**
 * Normalize MCP tool name
 */
function normalizeMCPToolName(toolName, serverName) {
    return `${serverName}_${toolName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;
}
/**
 * Get MCP tools by server
 */
function groupMCPToolsByServer(tools) {
    const grouped = new Map();
    for (const tool of tools) {
        const existing = grouped.get(tool.serverName) || [];
        existing.push(tool);
        grouped.set(tool.serverName, existing);
    }
    return grouped;
}
//# sourceMappingURL=utils.js.map
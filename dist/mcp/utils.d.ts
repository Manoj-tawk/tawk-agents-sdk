/**
 * MCP Utility Functions
 *
 * Helper functions for MCP server integration.
 *
 * @module mcp-utils
 */
import type { MCPTool } from '../types/types';
import type { ToolDefinition } from '../types/types';
/**
 * Filter for MCP tools
 */
export type MCPToolFilter = {
    /**
     * List of tool names to include
     */
    includeTools?: string[];
    /**
     * List of tool names to exclude
     */
    excludeTools?: string[];
    /**
     * Pattern to match tool names
     */
    pattern?: RegExp;
};
/**
 * Apply filter to MCP tools
 */
export declare function filterMCPTools(tools: MCPTool[], filter: MCPToolFilter): MCPTool[];
/**
 * Create static filter for MCP tools
 */
export declare function createMCPToolStaticFilter(config: {
    allowedTools?: string[];
    blockedTools?: string[];
}): MCPToolFilter;
/**
 * Convert MCP tool to function tool definition
 */
export declare function mcpToFunctionTool(mcpTool: MCPTool): ToolDefinition;
/**
 * Normalize MCP tool name
 */
export declare function normalizeMCPToolName(toolName: string, serverName: string): string;
/**
 * Get MCP tools by server
 */
export declare function groupMCPToolsByServer(tools: MCPTool[]): Map<string, MCPTool[]>;
//# sourceMappingURL=utils.d.ts.map
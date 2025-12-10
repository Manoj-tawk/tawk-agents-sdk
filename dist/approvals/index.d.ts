/**
 * Human-in-the-Loop Support
 *
 * Allows agents to request approval before executing sensitive tools
 */
import type { ApprovalConfig, ApprovalResponse, PendingApproval } from '../types/types';
/**
 * Manager for human-in-the-loop approvals.
 * Handles approval requests, responses, and timeouts.
 *
 * @example
 * ```typescript
 * const manager = new ApprovalManager();
 *
 * const approved = await manager.requestApproval(
 *   'deleteFile',
 *   { path: '/important.txt' },
 *   {
 *     requiredForTools: ['deleteFile'],
 *     requestApproval: createCLIApprovalHandler()
 *   }
 * );
 * ```
 */
export declare class ApprovalManager {
    private pendingApprovals;
    private approvalResponses;
    /**
     * Check if a tool requires approval based on configuration.
     *
     * @param {string} toolName - Name of the tool
     * @param {ApprovalConfig} [config] - Approval configuration
     * @returns {boolean} True if tool requires approval
     */
    requiresApproval(toolName: string, config?: ApprovalConfig): boolean;
    /**
     * Request approval for a tool execution.
     * Creates a pending approval and waits for response from the handler.
     *
     * @param {string} toolName - Name of the tool requesting approval
     * @param {any} args - Arguments for the tool call
     * @param {ApprovalConfig} config - Approval configuration with handler
     * @returns {Promise<ApprovalResponse>} Approval response (approved/rejected)
     * @throws {Error} If approval times out
     */
    requestApproval(toolName: string, args: any, config: ApprovalConfig): Promise<ApprovalResponse>;
    /**
     * Get a pending approval by its token.
     *
     * @param {string} token - Approval token
     * @returns {PendingApproval | undefined} Pending approval or undefined if not found
     */
    getPendingApproval(token: string): PendingApproval | undefined;
    /**
     * Submit an approval response for a pending approval.
     *
     * @param {string} token - Approval token
     * @param {ApprovalResponse} response - Approval response
     * @returns {void}
     */
    submitApproval(token: string, response: ApprovalResponse): void;
    /**
     * Get all currently pending approvals.
     *
     * @returns {PendingApproval[]} Array of pending approvals
     */
    getPendingApprovals(): PendingApproval[];
    /**
     * Clear expired pending approvals older than the specified age.
     *
     * @param {number} [maxAge] - Maximum age in milliseconds (default: 600000 = 10 minutes)
     * @returns {void}
     */
    clearExpired(maxAge?: number): void;
    private generateToken;
    private timeout;
}
/**
 * Get or create the global approval manager instance.
 *
 * @returns {ApprovalManager} Global approval manager
 */
export declare function getGlobalApprovalManager(): ApprovalManager;
/**
 * Create a CLI-based approval handler that prompts the user in the terminal.
 *
 * @returns {Function} Approval handler function
 *
 * @example
 * ```typescript
 * const handler = createCLIApprovalHandler();
 * const approved = await handler('deleteFile', { path: '/tmp/file.txt' });
 * ```
 */
export declare function createCLIApprovalHandler(): ApprovalConfig['requestApproval'];
/**
 * Create a webhook-based approval handler that sends requests to an external API.
 *
 * @param {string} webhookUrl - URL to send approval requests to
 * @param {string} [apiKey] - Optional API key for authentication
 * @returns {Function} Approval handler function
 *
 * @example
 * ```typescript
 * const handler = createWebhookApprovalHandler(
 *   'https://api.example.com/approve',
 *   'secret-key'
 * );
 * ```
 */
export declare function createWebhookApprovalHandler(webhookUrl: string, apiKey?: string): ApprovalConfig['requestApproval'];
/**
 * Create an approval handler that always approves (for testing)
 */
export declare function createAutoApproveHandler(): ApprovalConfig['requestApproval'];
/**
 * Create an approval handler that always rejects (for testing)
 */
export declare function createAutoRejectHandler(): ApprovalConfig['requestApproval'];
//# sourceMappingURL=index.d.ts.map
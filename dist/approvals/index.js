"use strict";
/**
 * Human-in-the-Loop Support
 *
 * Allows agents to request approval before executing sensitive tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalManager = void 0;
exports.getGlobalApprovalManager = getGlobalApprovalManager;
exports.createCLIApprovalHandler = createCLIApprovalHandler;
exports.createWebhookApprovalHandler = createWebhookApprovalHandler;
exports.createAutoApproveHandler = createAutoApproveHandler;
exports.createAutoRejectHandler = createAutoRejectHandler;
const crypto_1 = require("crypto");
// ============================================
// APPROVAL MANAGER
// ============================================
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
class ApprovalManager {
    constructor() {
        this.pendingApprovals = new Map();
        this.approvalResponses = new Map();
    }
    /**
     * Check if a tool requires approval based on configuration.
     *
     * @param {string} toolName - Name of the tool
     * @param {ApprovalConfig} [config] - Approval configuration
     * @returns {boolean} True if tool requires approval
     */
    requiresApproval(toolName, config) {
        if (!config)
            return false;
        return config.requiredForTools?.includes(toolName) || false;
    }
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
    async requestApproval(toolName, args, config) {
        const approvalToken = this.generateToken();
        // Store pending approval
        const pending = {
            toolName,
            args,
            approvalToken,
            requestedAt: Date.now(),
            status: 'pending',
        };
        this.pendingApprovals.set(approvalToken, pending);
        try {
            // Request approval from the configured handler
            const response = await Promise.race([
                config.requestApproval(toolName, args),
                this.timeout(config.timeout || 300000), // Default 5 minutes
            ]);
            // Update status
            pending.status = response.approved ? 'approved' : 'rejected';
            this.approvalResponses.set(approvalToken, response);
            return response;
        }
        catch {
            pending.status = 'timeout';
            throw new Error(`Approval timeout for tool: ${toolName}`);
        }
    }
    /**
     * Get a pending approval by its token.
     *
     * @param {string} token - Approval token
     * @returns {PendingApproval | undefined} Pending approval or undefined if not found
     */
    getPendingApproval(token) {
        return this.pendingApprovals.get(token);
    }
    /**
     * Submit an approval response for a pending approval.
     *
     * @param {string} token - Approval token
     * @param {ApprovalResponse} response - Approval response
     * @returns {void}
     */
    submitApproval(token, response) {
        const pending = this.pendingApprovals.get(token);
        if (pending) {
            pending.status = response.approved ? 'approved' : 'rejected';
            this.approvalResponses.set(token, response);
        }
    }
    /**
     * Get all currently pending approvals.
     *
     * @returns {PendingApproval[]} Array of pending approvals
     */
    getPendingApprovals() {
        return Array.from(this.pendingApprovals.values()).filter((p) => p.status === 'pending');
    }
    /**
     * Clear expired pending approvals older than the specified age.
     *
     * @param {number} [maxAge] - Maximum age in milliseconds (default: 600000 = 10 minutes)
     * @returns {void}
     */
    clearExpired(maxAge = 600000) {
        const now = Date.now();
        for (const [token, pending] of this.pendingApprovals) {
            if (now - pending.requestedAt > maxAge) {
                pending.status = 'timeout';
                this.pendingApprovals.delete(token);
            }
        }
    }
    generateToken() {
        return (0, crypto_1.randomBytes)(16).toString('hex');
    }
    timeout(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), ms);
        });
    }
}
exports.ApprovalManager = ApprovalManager;
// ============================================
// GLOBAL APPROVAL MANAGER
// ============================================
let globalApprovalManager = null;
/**
 * Get or create the global approval manager instance.
 *
 * @returns {ApprovalManager} Global approval manager
 */
function getGlobalApprovalManager() {
    if (!globalApprovalManager) {
        globalApprovalManager = new ApprovalManager();
    }
    return globalApprovalManager;
}
// ============================================
// HELPER FUNCTIONS
// ============================================
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
function createCLIApprovalHandler() {
    return async (toolName, args) => {
        // In a real implementation, this would prompt the user in the CLI
        // For now, return a promise that can be resolved externally
        console.log(`\n⚠️  Approval required for tool: ${toolName}`);
        console.log('Arguments:', JSON.stringify(args, null, 2));
        console.log('Approve? (y/n)');
        // This is a placeholder - in real use, implement proper CLI prompts
        return new Promise((resolve) => {
            if (process.stdin.isTTY) {
                process.stdin.once('data', (data) => {
                    const input = data.toString().trim().toLowerCase();
                    resolve({
                        approved: input === 'y' || input === 'yes',
                        reason: input === 'y' ? undefined : 'User rejected',
                    });
                });
            }
            else {
                // Non-interactive - auto-reject
                resolve({
                    approved: false,
                    reason: 'Non-interactive environment',
                });
            }
        });
    };
}
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
function createWebhookApprovalHandler(webhookUrl, apiKey) {
    return async (toolName, args) => {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
            },
            body: JSON.stringify({
                toolName,
                args,
                timestamp: Date.now(),
            }),
        });
        if (!response.ok) {
            throw new Error(`Webhook approval request failed: ${response.statusText}`);
        }
        return await response.json();
    };
}
/**
 * Create an approval handler that always approves (for testing)
 */
function createAutoApproveHandler() {
    return async (toolName, _args) => {
        console.log(`✅ Auto-approved: ${toolName}`);
        return { approved: true };
    };
}
/**
 * Create an approval handler that always rejects (for testing)
 */
function createAutoRejectHandler() {
    return async (toolName, _args) => {
        console.log(`❌ Auto-rejected: ${toolName}`);
        return { approved: false, reason: 'Auto-rejected for testing' };
    };
}
//# sourceMappingURL=index.js.map
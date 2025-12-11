"use strict";
/**
 * Dynamic HITL (Human-in-the-Loop) Approval System
 *
 * Provides context-aware, dynamic approval flows for tool execution.
 *
 * Features:
 * - Per-tool needsApproval function
 * - Context-aware approval logic
 * - Severity levels
 * - Role-based approvals
 * - Approval metadata tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalPolicies = exports.ApprovalManager = void 0;
exports.toolWithApproval = toolWithApproval;
exports.formatApprovalRequest = formatApprovalRequest;
// ============================================
// APPROVAL MANAGER
// ============================================
class ApprovalManager {
    constructor() {
        this.pendingApprovals = new Map();
        this.approvalHistory = [];
    }
    /**
     * Check if a tool call needs approval
     */
    async checkNeedsApproval(tool, context, args, callId) {
        if (!tool.needsApproval) {
            return false;
        }
        try {
            if (typeof tool.needsApproval === 'function') {
                return await Promise.resolve(tool.needsApproval(context, args, callId));
            }
            return tool.needsApproval;
        }
        catch (_error) {
            // Default to requiring approval on error (safer)
            return true;
        }
    }
    /**
     * Create an approval request
     */
    createApprovalRequest(toolName, tool, args, callId, context, reason) {
        const request = {
            id: callId,
            toolName,
            args,
            callId,
            context,
            metadata: {
                reason: reason || tool.approvalMetadata?.reason,
                severity: tool.approvalMetadata?.severity || 'medium',
                requiredRole: tool.approvalMetadata?.requiredRole,
                timestamp: Date.now(),
            },
            status: 'pending',
        };
        this.pendingApprovals.set(callId, request);
        return request;
    }
    /**
     * Approve a tool call
     */
    approve(callId, reason, _approver) {
        const request = this.pendingApprovals.get(callId);
        if (request) {
            request.status = 'approved';
            if (reason)
                request.metadata.reason = reason;
            // Move to history
            this.approvalHistory.push({ ...request });
            this.pendingApprovals.delete(callId);
        }
    }
    /**
     * Reject a tool call
     */
    reject(callId, reason) {
        const request = this.pendingApprovals.get(callId);
        if (request) {
            request.status = 'rejected';
            if (reason)
                request.metadata.reason = reason;
            // Move to history
            this.approvalHistory.push({ ...request });
            this.pendingApprovals.delete(callId);
        }
    }
    /**
     * Get pending approvals
     */
    getPendingApprovals() {
        return Array.from(this.pendingApprovals.values());
    }
    /**
     * Get approval request by callId
     */
    getApprovalRequest(callId) {
        return this.pendingApprovals.get(callId);
    }
    /**
     * Check if a call is approved
     */
    isApproved(callId) {
        const request = this.pendingApprovals.get(callId);
        return request?.status === 'approved';
    }
    /**
     * Check if a call is rejected
     */
    isRejected(callId) {
        const request = this.pendingApprovals.get(callId);
        return request?.status === 'rejected';
    }
    /**
     * Get approval history
     */
    getHistory() {
        return [...this.approvalHistory];
    }
    /**
     * Clear all pending approvals
     */
    clearPending() {
        this.pendingApprovals.clear();
    }
    /**
     * Clear approval history
     */
    clearHistory() {
        this.approvalHistory = [];
    }
}
exports.ApprovalManager = ApprovalManager;
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Common approval policies
 */
exports.ApprovalPolicies = {
    /**
     * Require approval for admin users only
     */
    requireAdminRole: (requiredRole = 'admin') => (context) => !context.user?.roles?.includes(requiredRole),
    /**
     * Require approval based on argument values
     */
    requireForArgs: (check) => (_context, args) => check(args),
    /**
     * Require approval based on context state
     */
    requireForState: (check) => (context) => check(context),
    /**
     * Require approval if count exceeds threshold
     */
    requireAfterCount: (key, threshold) => (context) => (context[key] || 0) >= threshold,
    /**
     * Require approval for sensitive paths
     */
    requireForSensitivePaths: (sensitivePrefixes) => (_context, args) => sensitivePrefixes.some((prefix) => args.path?.startsWith(prefix)),
    /**
     * Always require approval
     */
    always: () => true,
    /**
     * Never require approval
     */
    never: () => false,
    /**
     * Combine multiple policies (OR logic)
     */
    any: (...policies) => async (context, args, callId) => {
        for (const policy of policies) {
            if (await Promise.resolve(policy(context, args, callId))) {
                return true;
            }
        }
        return false;
    },
    /**
     * Combine multiple policies (AND logic)
     */
    all: (...policies) => async (context, args, callId) => {
        for (const policy of policies) {
            if (!(await Promise.resolve(policy(context, args, callId)))) {
                return false;
            }
        }
        return true;
    },
};
// ============================================
// APPROVAL HELPERS
// ============================================
/**
 * Create an approval-aware tool
 */
function toolWithApproval(config) {
    return {
        description: config.description,
        inputSchema: config.inputSchema,
        execute: config.execute,
        needsApproval: config.needsApproval,
        approvalMetadata: config.approvalMetadata,
    };
}
/**
 * Format approval request for display
 */
function formatApprovalRequest(request) {
    const severity = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        critical: '🔴',
    }[request.metadata.severity];
    return `
${severity} APPROVAL REQUIRED
Tool: ${request.toolName}
Args: ${JSON.stringify(request.args, null, 2)}
Severity: ${request.metadata.severity}
${request.metadata.requiredRole ? `Required Role: ${request.metadata.requiredRole}` : ''}
${request.metadata.reason ? `Reason: ${request.metadata.reason}` : ''}
`.trim();
}
//# sourceMappingURL=approvals.js.map
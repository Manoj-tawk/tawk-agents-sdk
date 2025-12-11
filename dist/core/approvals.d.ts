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
import type { CoreTool } from '../core/agent';
/**
 * Extended CoreTool with approval fields
 */
export interface ApprovalTool extends CoreTool {
    needsApproval?: ApprovalFunction | boolean;
    approvalMetadata?: {
        reason?: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        requiredRole?: string;
    };
}
export interface ApprovalRequest {
    id: string;
    toolName: string;
    args: any;
    callId: string;
    context: any;
    metadata: {
        reason?: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        requiredRole?: string;
        timestamp: number;
    };
    status: 'pending' | 'approved' | 'rejected';
}
export interface ApprovalDecision {
    callId: string;
    approved: boolean;
    reason?: string;
    approver?: string;
}
export type ApprovalFunction = (context: any, args: any, callId: string) => Promise<boolean> | boolean;
export declare class ApprovalManager {
    private pendingApprovals;
    private approvalHistory;
    /**
     * Check if a tool call needs approval
     */
    checkNeedsApproval(tool: ApprovalTool, context: any, args: any, callId: string): Promise<boolean>;
    /**
     * Create an approval request
     */
    createApprovalRequest(toolName: string, tool: ApprovalTool, args: any, callId: string, context: any, reason?: string): ApprovalRequest;
    /**
     * Approve a tool call
     */
    approve(callId: string, reason?: string, _approver?: string): void;
    /**
     * Reject a tool call
     */
    reject(callId: string, reason?: string): void;
    /**
     * Get pending approvals
     */
    getPendingApprovals(): ApprovalRequest[];
    /**
     * Get approval request by callId
     */
    getApprovalRequest(callId: string): ApprovalRequest | undefined;
    /**
     * Check if a call is approved
     */
    isApproved(callId: string): boolean;
    /**
     * Check if a call is rejected
     */
    isRejected(callId: string): boolean;
    /**
     * Get approval history
     */
    getHistory(): ApprovalRequest[];
    /**
     * Clear all pending approvals
     */
    clearPending(): void;
    /**
     * Clear approval history
     */
    clearHistory(): void;
}
/**
 * Common approval policies
 */
export declare const ApprovalPolicies: {
    /**
     * Require approval for admin users only
     */
    requireAdminRole: (requiredRole?: string) => (context: any) => boolean;
    /**
     * Require approval based on argument values
     */
    requireForArgs: (check: (args: any) => boolean) => (_context: any, args: any) => boolean;
    /**
     * Require approval based on context state
     */
    requireForState: (check: (context: any) => boolean) => (context: any) => boolean;
    /**
     * Require approval if count exceeds threshold
     */
    requireAfterCount: (key: string, threshold: number) => (context: any) => boolean;
    /**
     * Require approval for sensitive paths
     */
    requireForSensitivePaths: (sensitivePrefixes: string[]) => (_context: any, args: any) => boolean;
    /**
     * Always require approval
     */
    always: () => boolean;
    /**
     * Never require approval
     */
    never: () => boolean;
    /**
     * Combine multiple policies (OR logic)
     */
    any: (...policies: ApprovalFunction[]) => (context: any, args: any, callId: string) => Promise<boolean>;
    /**
     * Combine multiple policies (AND logic)
     */
    all: (...policies: ApprovalFunction[]) => (context: any, args: any, callId: string) => Promise<boolean>;
};
/**
 * Create an approval-aware tool
 */
export declare function toolWithApproval(config: {
    description: string;
    inputSchema: any;
    execute: (args: any, context?: any) => Promise<any> | any;
    needsApproval?: ApprovalFunction;
    approvalMetadata?: {
        severity?: 'low' | 'medium' | 'high' | 'critical';
        category?: string;
        requiredRole?: string;
        reason?: string;
    };
}): ApprovalTool;
/**
 * Format approval request for display
 */
export declare function formatApprovalRequest(request: ApprovalRequest): string;
//# sourceMappingURL=approvals.d.ts.map
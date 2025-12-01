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

// ============================================
// TYPES
// ============================================

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

export type ApprovalFunction = (
  context: any,
  args: any,
  callId: string
) => Promise<boolean> | boolean;

// ============================================
// APPROVAL MANAGER
// ============================================

export class ApprovalManager {
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private approvalHistory: ApprovalRequest[] = [];

  /**
   * Check if a tool call needs approval
   */
  async checkNeedsApproval(
    tool: CoreTool,
    context: any,
    args: any,
    callId: string
  ): Promise<boolean> {
    if (!tool.needsApproval) {
      return false;
    }

    try {
      return await Promise.resolve(tool.needsApproval(context, args, callId));
    } catch (error) {
      console.error('Error in needsApproval function:', error);
      // Default to requiring approval on error (safer)
      return true;
    }
  }

  /**
   * Create an approval request
   */
  createApprovalRequest(
    toolName: string,
    tool: CoreTool,
    args: any,
    callId: string,
    context: any,
    reason?: string
  ): ApprovalRequest {
    const request: ApprovalRequest = {
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
  approve(callId: string, reason?: string, approver?: string): void {
    const request = this.pendingApprovals.get(callId);
    if (request) {
      request.status = 'approved';
      if (reason) request.metadata.reason = reason;
      
      // Move to history
      this.approvalHistory.push({ ...request });
      this.pendingApprovals.delete(callId);
    }
  }

  /**
   * Reject a tool call
   */
  reject(callId: string, reason?: string): void {
    const request = this.pendingApprovals.get(callId);
    if (request) {
      request.status = 'rejected';
      if (reason) request.metadata.reason = reason;
      
      // Move to history
      this.approvalHistory.push({ ...request });
      this.pendingApprovals.delete(callId);
    }
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values());
  }

  /**
   * Get approval request by callId
   */
  getApprovalRequest(callId: string): ApprovalRequest | undefined {
    return this.pendingApprovals.get(callId);
  }

  /**
   * Check if a call is approved
   */
  isApproved(callId: string): boolean {
    const request = this.pendingApprovals.get(callId);
    return request?.status === 'approved';
  }

  /**
   * Check if a call is rejected
   */
  isRejected(callId: string): boolean {
    const request = this.pendingApprovals.get(callId);
    return request?.status === 'rejected';
  }

  /**
   * Get approval history
   */
  getHistory(): ApprovalRequest[] {
    return [...this.approvalHistory];
  }

  /**
   * Clear all pending approvals
   */
  clearPending(): void {
    this.pendingApprovals.clear();
  }

  /**
   * Clear approval history
   */
  clearHistory(): void {
    this.approvalHistory = [];
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Common approval policies
 */
export const ApprovalPolicies = {
  /**
   * Require approval for admin users only
   */
  requireAdminRole:
    (requiredRole = 'admin') =>
    (context: any) =>
      !context.user?.roles?.includes(requiredRole),

  /**
   * Require approval based on argument values
   */
  requireForArgs:
    (check: (args: any) => boolean) => (_context: any, args: any) =>
      check(args),

  /**
   * Require approval based on context state
   */
  requireForState:
    (check: (context: any) => boolean) => (context: any) =>
      check(context),

  /**
   * Require approval if count exceeds threshold
   */
  requireAfterCount:
    (key: string, threshold: number) =>
    (context: any) =>
      (context[key] || 0) >= threshold,

  /**
   * Require approval for sensitive paths
   */
  requireForSensitivePaths:
    (sensitivePrefixes: string[]) =>
    (_context: any, args: any) =>
      sensitivePrefixes.some((prefix) => args.path?.startsWith(prefix)),

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
  any:
    (...policies: ApprovalFunction[]) =>
    async (context: any, args: any, callId: string) => {
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
  all:
    (...policies: ApprovalFunction[]) =>
    async (context: any, args: any, callId: string) => {
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
export function toolWithApproval(config: {
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
}): CoreTool {
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
export function formatApprovalRequest(request: ApprovalRequest): string {
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



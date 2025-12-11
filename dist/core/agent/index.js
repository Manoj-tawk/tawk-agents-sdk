"use strict";
/**
 * Agent Module - Main Exports
 *
 * @module core/agent
 * @description
 * Barrel export file that provides the complete Agent API.
 * Maintains 100% backward compatibility with the original agent.ts file.
 *
 * **Exported Components**:
 * - Agent class and utilities
 * - Type definitions
 * - Tool creation function
 * - Model management functions
 *
 * @author Tawk.to
 * @license MIT
 * @version 1.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStream = exports.run = exports.tool = exports.getDefaultModel = exports.setDefaultModel = exports.Agent = void 0;
// ============================================
// AGENT CLASS
// ============================================
var agent_class_1 = require("./agent-class");
Object.defineProperty(exports, "Agent", { enumerable: true, get: function () { return agent_class_1.Agent; } });
Object.defineProperty(exports, "setDefaultModel", { enumerable: true, get: function () { return agent_class_1.setDefaultModel; } });
Object.defineProperty(exports, "getDefaultModel", { enumerable: true, get: function () { return agent_class_1.getDefaultModel; } });
// ============================================
// TOOL UTILITIES
// ============================================
var tools_1 = require("./tools");
Object.defineProperty(exports, "tool", { enumerable: true, get: function () { return tools_1.tool; } });
// ============================================
// EXECUTION FUNCTIONS
// ============================================
var run_1 = require("./run");
Object.defineProperty(exports, "run", { enumerable: true, get: function () { return run_1.run; } });
Object.defineProperty(exports, "runStream", { enumerable: true, get: function () { return run_1.runStream; } });
// ============================================
// RE-EXPORTS FOR COMPATIBILITY
// ============================================
// Export everything that was in the original agent.ts
// to maintain 100% backward compatibility
__exportStar(require("./types"), exports);
__exportStar(require("./agent-class"), exports);
__exportStar(require("./tools"), exports);
__exportStar(require("./run"), exports);
//# sourceMappingURL=index.js.map
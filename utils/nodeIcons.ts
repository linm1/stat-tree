/**
 * Node icon utilities for expand/collapse indicators
 * Phase 6: Visual indicators for progressive disclosure
 *
 * Provides functions for:
 * - Detecting expandable nodes
 * - Adding expand/collapse icons to node text
 * - Managing icon state based on expansion
 */

import { DecisionNode, TreeData } from '../types';

/**
 * Unicode characters for expand/collapse icons
 */
export const EXPAND_ICON = '▶'; // Right-pointing triangle
export const COLLAPSE_ICON = '▼'; // Down-pointing triangle

/**
 * Check if a node has children and is expandable
 *
 * @param nodeId - ID of the node to check
 * @param data - Tree data structure
 * @returns true if node has children, false otherwise
 */
export const hasChildren = (nodeId: string, data: TreeData): boolean => {
  const node = data[nodeId];
  if (!node) return false;

  return Boolean(node.options && node.options.length > 0);
};

/**
 * Check if a node is expandable (alias for hasChildren for clarity)
 *
 * @param node - Decision node to check
 * @returns true if node has options/children
 */
export const isExpandable = (node: DecisionNode): boolean => {
  return Boolean(node.options && node.options.length > 0);
};

/**
 * Add expand/collapse icon prefix to node text
 *
 * @param text - Original node text
 * @param isExpandableNode - Whether the node has children
 * @param isExpanded - Whether the node is currently expanded
 * @returns Text with icon prefix if expandable, original text otherwise
 */
export const addIconToText = (
  text: string,
  isExpandableNode: boolean,
  isExpanded: boolean
): string => {
  if (!isExpandableNode) {
    return text;
  }

  const icon = isExpanded ? COLLAPSE_ICON : EXPAND_ICON;
  return `${icon} ${text}`;
};

/**
 * Get the appropriate icon for a node's current state
 *
 * @param isExpanded - Whether the node is expanded
 * @returns Expand (▶) or collapse (▼) icon
 */
export const getNodeIcon = (isExpanded: boolean): string => {
  return isExpanded ? COLLAPSE_ICON : EXPAND_ICON;
};

/**
 * Create display text for a node with icon (if applicable)
 * Combines expandability check, icon selection, and text formatting
 *
 * @param nodeId - ID of the node
 * @param text - Original node text
 * @param data - Tree data structure
 * @param expansionState - Current expansion state (set of expanded node IDs)
 * @returns Formatted text with icon prefix if needed
 */
export const getNodeDisplayText = (
  nodeId: string,
  text: string,
  data: TreeData,
  expansionState?: Set<string>
): string => {
  const isExpandableNode = hasChildren(nodeId, data);

  if (!isExpandableNode) {
    return text;
  }

  const isExpanded = expansionState?.has(nodeId) || false;
  return addIconToText(text, isExpandableNode, isExpanded);
};

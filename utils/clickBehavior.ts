/**
 * Click Behavior Module
 *
 * Determines the appropriate action when a node is clicked in the map view.
 * Separates expandable nodes (which should expand/collapse) from leaf nodes
 * (which should navigate to the flow tab).
 */

import { TreeData } from '../types';

export type ClickAction = 'expand' | 'collapse' | 'navigate';

export interface ClickBehaviorResult {
  action: ClickAction;
  nodeId: string;
}

/**
 * Determines what should happen when a node is clicked
 *
 * Rules:
 * - If node has children AND is collapsed → return 'expand'
 * - If node has children AND is expanded → return 'collapse'
 * - If node has no children (leaf) → return 'navigate'
 *
 * @param nodeId - ID of the clicked node
 * @param isExpanded - Whether the node is currently expanded
 * @param data - Tree data structure
 * @returns Action to perform and the node ID
 */
export function determineClickAction(
  nodeId: string,
  isExpanded: boolean,
  data: TreeData
): ClickBehaviorResult {
  const node = data[nodeId];

  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  // Check if node has children (options)
  const hasChildren = node.options && node.options.length > 0;

  if (hasChildren) {
    // Expandable node - toggle expansion
    return {
      action: isExpanded ? 'collapse' : 'expand',
      nodeId
    };
  } else {
    // Leaf node - navigate to flow tab
    return {
      action: 'navigate',
      nodeId
    };
  }
}

/**
 * Checks if a node should trigger navigation (jump to flow tab)
 *
 * @param nodeId - ID of the node to check
 * @param data - Tree data structure
 * @returns true if clicking should navigate to flow tab
 */
export function shouldNavigateOnClick(nodeId: string, data: TreeData): boolean {
  const node = data[nodeId];
  if (!node) return false;

  // Navigate if node has no children (is a leaf/result node)
  return !node.options || node.options.length === 0;
}

/**
 * Checks if a node should trigger expansion/collapse
 *
 * @param nodeId - ID of the node to check
 * @param data - Tree data structure
 * @returns true if clicking should expand/collapse
 */
export function shouldToggleOnClick(nodeId: string, data: TreeData): boolean {
  const node = data[nodeId];
  if (!node) return false;

  // Toggle if node has children (is expandable)
  return node.options !== undefined && node.options.length > 0;
}

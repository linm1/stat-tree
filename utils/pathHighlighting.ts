/**
 * Path Highlighting Utilities (Phase 7)
 *
 * Functions for calculating and highlighting the active path in the decision tree
 */

import { TreeData } from '../types';
import { getAncestors as getAncestorsFromState } from './expansionState';

/**
 * Get all ancestor node IDs for a given node
 * Re-exports from expansionState for convenience
 * @param nodeId - The node to find ancestors for
 * @param data - The tree data structure
 * @returns Array of ancestor node IDs from root to parent (excluding nodeId itself)
 */
export function getAncestors(nodeId: string, data: TreeData): string[] {
  return getAncestorsFromState(nodeId, data);
}

/**
 * Calculate the complete path from root to a given node
 * @param nodeId - The target node
 * @param data - The tree data structure
 * @returns Array of node IDs from root to target (including target)
 */
export function calculatePathToNode(nodeId: string, data: TreeData): string[] {
  if (!data || !data[nodeId]) {
    return [];
  }

  const ancestors = getAncestors(nodeId, data);
  return [...ancestors, nodeId];
}

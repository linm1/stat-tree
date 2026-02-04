/**
 * Path Highlighting Utilities
 *
 * Functions for calculating and highlighting the active path in the decision tree
 */

import { TreeData } from '../types';
import { getAncestors as getAncestorsFromState } from './expansionState';

/**
 * Get all ancestor node IDs for a given node
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

/**
 * Get the set of edge IDs that should be highlighted for a given path
 * @param path - Array of node IDs from root to selected node
 * @returns Set of edge IDs that connect nodes along the path
 */
export function getHighlightedEdges(path: string[]): Set<string> {
  const edges = new Set<string>();

  if (!path || path.length < 2) {
    return edges;
  }

  // Create edge IDs for consecutive node pairs
  // Format matches TldrawMapView: edge-node-{parentId}-node-{childId}
  for (let i = 0; i < path.length - 1; i++) {
    const parentId = path[i];
    const childId = path[i + 1];
    const edgeId = `edge-node-${parentId}-node-${childId}`;
    edges.add(edgeId);
  }

  return edges;
}

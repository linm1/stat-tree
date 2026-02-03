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

/**
 * Get the set of edge IDs that should be highlighted for a given path
 * @param path - Array of node IDs from root to selected node
 * @returns Set of edge IDs that connect nodes along the path
 */
export function getHighlightedEdges(path: string[]): Set<string> {
  const edges = new Set<string>();

  // Need at least 2 nodes to create an edge
  if (!path || path.length < 2) {
    return edges;
  }

  // Create edge IDs for consecutive node pairs
  for (let i = 0; i < path.length - 1; i++) {
    const parentId = path[i];
    const childId = path[i + 1];
    const edgeId = `edge-${parentId}-${childId}`;
    edges.add(edgeId);
  }

  return edges;
}

/**
 * Check if a specific edge should be highlighted
 * @param edgeId - Edge ID in format "edge-{parentId}-{childId}"
 * @param highlightedPath - Set of node IDs on the highlighted path
 * @returns true if both endpoints are in the path
 *
 * Note: Handles node IDs containing hyphens by trying all possible split points
 * and checking if both resulting node IDs exist in the highlighted path.
 */
export function isEdgeHighlighted(edgeId: string, highlightedPath: Set<string>): boolean {
  // Validate edge ID format
  if (!edgeId || !edgeId.startsWith('edge-')) {
    return false;
  }

  // Remove "edge-" prefix and split remaining string
  const parts = edgeId.slice(5).split('-');

  // Need at least 2 parts to form an edge (parentId and childId)
  if (parts.length < 2) {
    return false;
  }

  // Handle node IDs that may contain hyphens by trying all possible splits
  // Example: "edge-node-1-node-2" could be split as:
  //   - "node" and "1-node-2"
  //   - "node-1" and "node-2"
  //   - "node-1-node" and "2"
  for (let i = 1; i < parts.length; i++) {
    const parentId = parts.slice(0, i).join('-');
    const childId = parts.slice(i).join('-');

    // Check if both parent and child are in the highlighted path
    if (highlightedPath.has(parentId) && highlightedPath.has(childId)) {
      return true;
    }
  }

  return false;
}

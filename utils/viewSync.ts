/**
 * Bidirectional View Sync State Management
 *
 * Provides utilities for synchronizing state between Interactive Flow view and Map view
 */

import { TreeData } from '../types';
import { calculatePathToNode } from './pathHighlighting';

/**
 * Result of syncing from Interactive Flow to Map view
 */
export interface MapSyncResult {
  selectedNodeId: string;
  highlightedPath: string[];
}

/**
 * Result of syncing from Map view to Interactive Flow
 */
export interface FlowSyncResult {
  history: string[];
  currentNodeId: string;
}

/**
 * Sync Interactive Flow state to Map view
 * @param history - The Interactive Flow history array (e.g., ['start', 'compare_groups', 'cont_time'])
 * @param data - Tree data for validation
 * @returns MapSyncResult with selected node and full path
 */
export function syncFlowToMap(history: string[], data: TreeData): MapSyncResult {
  // Handle empty history
  if (!history || history.length === 0) {
    return {
      selectedNodeId: '',
      highlightedPath: []
    };
  }

  // Get the last element as the selected node
  const selectedNodeId = history[history.length - 1];

  // Calculate the full path from root to the selected node
  const highlightedPath = calculatePathToNode(selectedNodeId, data);

  return {
    selectedNodeId,
    highlightedPath
  };
}

/**
 * Sync Map view selection to Interactive Flow
 * @param selectedNodeId - The node selected in Map view
 * @param data - Tree data for path calculation
 * @returns FlowSyncResult with new history array
 */
export function syncMapToFlow(selectedNodeId: string, data: TreeData): FlowSyncResult {
  // Handle empty or missing node ID
  if (!selectedNodeId) {
    return {
      history: [],
      currentNodeId: selectedNodeId
    };
  }

  // Calculate the full path from root to the selected node
  const history = calculatePathToNode(selectedNodeId, data);

  return {
    history,
    currentNodeId: selectedNodeId
  };
}

/**
 * Check if two paths are equivalent (same nodes in same order)
 * @param path1 - First path
 * @param path2 - Second path
 * @returns true if paths are identical
 */
export function arePathsEqual(path1: string[], path2: string[]): boolean {
  // Check if lengths are different
  if (path1.length !== path2.length) {
    return false;
  }

  // Compare each element
  for (let i = 0; i < path1.length; i++) {
    if (path1[i] !== path2[i]) {
      return false;
    }
  }

  return true;
}

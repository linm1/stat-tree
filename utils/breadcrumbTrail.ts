/**
 * Breadcrumb Trail Utilities (Phase 9)
 *
 * Functions for breadcrumb path calculation and navigation
 */

import { TreeData, ExpansionState } from '../types';

/**
 * Get the current expanded path from root to deepest expanded node
 * Follows the first expanded child at each level
 * @param state - Current expansion state
 * @param data - Tree data structure
 * @returns Array of node IDs representing the breadcrumb path
 */
export function getExpandedPath(state: ExpansionState, data: TreeData): string[] {
  const path: string[] = ['start'];
  let currentId = 'start';

  // Traverse down the tree following expanded nodes
  while (state.expandedNodes.has(currentId)) {
    const currentNode = data[currentId];

    // If no children, stop
    if (!currentNode || !currentNode.options || currentNode.options.length === 0) {
      break;
    }

    // Find first expanded child
    let foundExpandedChild = false;
    for (const option of currentNode.options) {
      const childId = option.nextNodeId;
      if (state.expandedNodes.has(childId)) {
        path.push(childId);
        currentId = childId;
        foundExpandedChild = true;
        break; // Only follow first expanded child
      }
    }

    // If no expanded child found, stop
    if (!foundExpandedChild) {
      break;
    }
  }

  return path;
}

/**
 * Handle breadcrumb click to collapse nodes after the clicked node
 * @param nodeId - Clicked node ID
 * @param path - Current breadcrumb path
 * @param state - Current expansion state
 * @returns New expansion state with nodes after clicked node collapsed
 */
export function handleBreadcrumbClick(
  nodeId: string,
  path: string[],
  state: ExpansionState
): ExpansionState {
  // Find index of clicked node in path
  const clickedIndex = path.indexOf(nodeId);

  // If node not in path, return unchanged state
  if (clickedIndex === -1) {
    return state;
  }

  // If clicked on last node, nothing to collapse
  if (clickedIndex === path.length - 1) {
    return state;
  }

  // Get nodes to collapse (everything after clicked node)
  const nodesToCollapse = path.slice(clickedIndex + 1);

  // Create new expanded set without the nodes to collapse
  const newExpandedNodes = new Set(state.expandedNodes);
  nodesToCollapse.forEach(id => {
    newExpandedNodes.delete(id);
  });

  return {
    ...state,
    expandedNodes: newExpandedNodes
  };
}

/**
 * Truncate breadcrumb text to fit display
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default 30)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateBreadcrumbText(text: string, maxLength: number = 30): string {
  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength) + '...';
}

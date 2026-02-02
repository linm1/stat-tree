import { TreeData, ExpansionState } from '../types';
import { LayoutNode } from './treeLayout';

// Re-export for convenience
export type { ExpansionState };

/**
 * Creates the initial expansion state with root node expanded
 */
export function createInitialExpansionState(): ExpansionState {
  return {
    expandedNodes: new Set(['start']),
    collapsedSubtrees: new Set()
  };
}

/**
 * Checks if a node has children (is expandable)
 */
export function hasChildren(nodeId: string, data: TreeData): boolean {
  if (!nodeId || !data[nodeId]) {
    return false;
  }

  const node = data[nodeId];
  return Boolean(node.options && node.options.length > 0);
}

/**
 * Gets all descendant node IDs recursively
 * Does not include the node itself
 */
export function getAllDescendants(nodeId: string, data: TreeData): string[] {
  if (!nodeId || !data[nodeId]) {
    return [];
  }

  const node = data[nodeId];
  if (!node.options || node.options.length === 0) {
    return [];
  }

  const descendants: string[] = [];
  const visited = new Set<string>(); // Prevent circular references

  const traverse = (currentId: string) => {
    if (visited.has(currentId)) {
      return;
    }
    visited.add(currentId);

    const currentNode = data[currentId];
    if (!currentNode?.options) {
      return;
    }

    for (const option of currentNode.options) {
      const childId = option.nextNodeId;
      descendants.push(childId);
      traverse(childId);
    }
  };

  traverse(nodeId);
  return descendants;
}

/**
 * Gets all ancestor node IDs from root to parent
 * Returns array in order: [root, ..., parent]
 * Does not include the node itself
 */
export function getAncestors(nodeId: string, data: TreeData): string[] {
  if (!nodeId || nodeId === 'start' || !data[nodeId]) {
    return [];
  }

  const ancestors: string[] = [];
  const visited = new Set<string>(); // Prevent circular references

  // Find parent by searching all nodes
  const findParent = (targetId: string): string | null => {
    for (const [currentId, node] of Object.entries(data)) {
      if (visited.has(currentId)) {
        continue;
      }

      if (node.options) {
        for (const option of node.options) {
          if (option.nextNodeId === targetId) {
            return currentId;
          }
        }
      }
    }
    return null;
  };

  let currentId = nodeId;
  while (currentId && currentId !== 'start') {
    const parentId = findParent(currentId);
    if (!parentId || visited.has(currentId)) {
      break;
    }
    visited.add(currentId);
    ancestors.unshift(parentId); // Add to front to maintain root->parent order
    currentId = parentId;
  }

  return ancestors;
}

/**
 * Expands a node (adds to expandedNodes, removes from collapsedSubtrees)
 * Immutable operation - returns new state
 */
export function expandNode(nodeId: string, state: ExpansionState): ExpansionState {
  const newExpandedNodes = new Set(state.expandedNodes);
  newExpandedNodes.add(nodeId);

  const newCollapsedSubtrees = new Set(state.collapsedSubtrees);
  newCollapsedSubtrees.delete(nodeId);

  return {
    expandedNodes: newExpandedNodes,
    collapsedSubtrees: newCollapsedSubtrees
  };
}

/**
 * Collapses a node and all its descendants
 * Immutable operation - returns new state
 * Root node cannot be collapsed
 */
export function collapseNode(
  nodeId: string,
  state: ExpansionState,
  data: TreeData
): ExpansionState {
  // Root node cannot be collapsed
  if (nodeId === 'start') {
    return state;
  }

  const descendants = getAllDescendants(nodeId, data);

  const newExpandedNodes = new Set(state.expandedNodes);
  newExpandedNodes.delete(nodeId);

  // Remove all descendants from expanded
  descendants.forEach(descendantId => {
    newExpandedNodes.delete(descendantId);
  });

  const newCollapsedSubtrees = new Set(state.collapsedSubtrees);
  newCollapsedSubtrees.add(nodeId);

  return {
    expandedNodes: newExpandedNodes,
    collapsedSubtrees: newCollapsedSubtrees
  };
}

/**
 * Toggles expansion state of a node
 * Root node cannot be collapsed
 */
export function toggleNodeExpansion(
  nodeId: string,
  state: ExpansionState,
  data: TreeData
): ExpansionState {
  // Root node cannot be toggled
  if (nodeId === 'start') {
    return state;
  }

  // If expanded, collapse it
  if (state.expandedNodes.has(nodeId)) {
    return collapseNode(nodeId, state, data);
  }

  // If collapsed, expand it
  return expandNode(nodeId, state);
}

/**
 * Checks if a node is visible based on expansion state
 * A node is visible if:
 * 1. It's the root node (level 1), OR
 * 2. Its parent is expanded AND no ancestor is in collapsedSubtrees
 */
export function isNodeVisible(
  nodeId: string,
  node: LayoutNode,
  state: ExpansionState,
  data: TreeData
): boolean {
  // Root is always visible
  if (node.level === 1 || nodeId === 'start') {
    return true;
  }

  // Check if this node itself is collapsed
  if (state.collapsedSubtrees.has(nodeId)) {
    return false;
  }

  // Check if any ancestor is collapsed
  const ancestors = getAncestors(nodeId, data);
  for (const ancestorId of ancestors) {
    if (state.collapsedSubtrees.has(ancestorId)) {
      return false;
    }
  }

  // Check if parent is expanded (last ancestor in the list)
  if (ancestors.length > 0) {
    const parentId = ancestors[ancestors.length - 1];
    if (!state.expandedNodes.has(parentId)) {
      return false;
    }
  }

  return true;
}

/**
 * Gets all visible nodes from the layout tree based on expansion state
 * Returns a flat array of visible LayoutNodes
 */
export function getVisibleNodes(
  layout: LayoutNode,
  state: ExpansionState,
  data: TreeData
): LayoutNode[] {
  const visible: LayoutNode[] = [];

  const traverse = (node: LayoutNode) => {
    // Check if this node is visible
    if (isNodeVisible(node.id, node, state, data)) {
      visible.push(node);

      // Traverse children if this node is expanded
      // (children themselves will be checked for visibility)
      if (state.expandedNodes.has(node.id)) {
        node.children.forEach(child => traverse(child));
      }
    }
  };

  traverse(layout);
  return visible;
}

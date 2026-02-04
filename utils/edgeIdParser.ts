/**
 * Edge ID Parser Utility
 *
 * Utilities for parsing and working with edge shape IDs in the Tldraw canvas.
 * Edge IDs follow the format: edge-node-{parentId}-node-{childId}-{segment}
 * where segment is one of: -h1, -h2, -v
 */

/**
 * Parse an edge shape ID to extract parent and child node IDs
 *
 * @param shapeId - The shape ID to parse (may include "shape:" prefix)
 * @returns Object with parentId and childId, or null if invalid
 *
 * @example
 * parseEdgeId('edge-node-start-node-categorical-h1')
 * // Returns: { parentId: 'start', childId: 'categorical' }
 *
 * parseEdgeId('shape:edge-node-compare_groups-node-two_groups-v')
 * // Returns: { parentId: 'compare_groups', childId: 'two_groups' }
 */
export function parseEdgeId(
  shapeId: string
): { parentId: string; childId: string } | null {
  if (!shapeId) {
    return null;
  }

  // Remove "shape:" prefix if present
  const cleanId = shapeId.startsWith('shape:')
    ? shapeId.substring(6)
    : shapeId;

  // Must start with "edge-node-"
  if (!cleanId.startsWith('edge-node-')) {
    return null;
  }

  // Pattern: edge-node-{parentId}-node-{childId}-{segment}
  // We need to find the two "-node-" markers
  const parts = cleanId.split('-node-');

  if (parts.length !== 3) {
    return null;
  }

  // parts[0] = "edge"
  // parts[1] = "{parentId}"
  // parts[2] = "{childId}-{segment}"

  const parentId = parts[1];

  // Extract childId by removing the segment suffix (-h1, -h2, or -v)
  const childPart = parts[2];
  const childId = childPart.replace(/-(h1|h2|v)$/, '');

  if (!parentId || !childId) {
    return null;
  }

  return { parentId, childId };
}

/**
 * Check if an edge is on the highlighted path
 *
 * An edge is considered highlighted if BOTH its parent and child nodes
 * are in the highlighted path set.
 *
 * @param shapeId - The edge shape ID to check
 * @param highlightedPath - Set of node IDs that are highlighted
 * @returns true if both parent and child are highlighted
 *
 * @example
 * const highlighted = new Set(['start', 'categorical', 'two_groups']);
 * isEdgeOnHighlightedPath('edge-node-start-node-categorical-h1', highlighted)
 * // Returns: true
 */
export function isEdgeOnHighlightedPath(
  shapeId: string,
  highlightedPath: Set<string>
): boolean {
  const parsed = parseEdgeId(shapeId);

  if (!parsed) {
    return false;
  }

  const { parentId, childId } = parsed;

  // Both parent and child must be in the highlighted path
  return highlightedPath.has(parentId) && highlightedPath.has(childId);
}

/**
 * Determine if an edge should be deleted when a node is collapsed
 *
 * An edge should be deleted if:
 * 1. Its child node is in the descendant set (will be hidden), OR
 * 2. Its parent node is the collapsed node itself
 *
 * @param shapeId - The edge shape ID to check
 * @param collapsedNodeId - The ID of the node being collapsed
 * @param descendantSet - Set of descendant node IDs that will be hidden
 * @returns true if the edge should be deleted
 *
 * @example
 * const descendants = new Set(['two_groups', 'paired', 'proc_ttest']);
 * shouldDeleteEdgeOnCollapse(
 *   'edge-node-categorical-node-two_groups-h1',
 *   'categorical',
 *   descendants
 * )
 * // Returns: true (child is in descendant set)
 */
export function shouldDeleteEdgeOnCollapse(
  shapeId: string,
  collapsedNodeId: string,
  descendantSet: Set<string>
): boolean {
  const parsed = parseEdgeId(shapeId);

  if (!parsed) {
    return false;
  }

  const { parentId, childId } = parsed;

  // Delete if child is a descendant (will be hidden)
  // OR if parent is the collapsed node
  return descendantSet.has(childId) || parentId === collapsedNodeId;
}

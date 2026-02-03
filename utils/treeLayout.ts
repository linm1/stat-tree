import { TreeData, DecisionNode } from '../types';

export interface LayoutConstants {
  nodeWidth: number;
  nodeHeight: number;
  siblingGap: number;
  levelGap: number;
  startX: number;
  startY: number;
}

export const DEFAULT_LAYOUT: LayoutConstants = {
  nodeWidth: 250,
  nodeHeight: 70,
  siblingGap: 10,
  levelGap: 450,
  startX: 0,
  startY: 0,
};

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  children: LayoutNode[];
}

/**
 * Calculate the width required for a node based on its immediate children.
 * This represents the horizontal space needed for the children layer.
 *
 * @param nodeId - The ID of the node to calculate width for
 * @param data - The tree data structure
 * @param constants - Layout constants defining spacing and dimensions
 * @returns The width required for the node's immediate children
 * @throws Error if node is not found in data
 */
export function calculateSubtreeWidth(
  nodeId: string,
  data: TreeData,
  constants: LayoutConstants
): number {
  const node = data[nodeId];

  if (!node) {
    throw new Error(`Node with id '${nodeId}' not found in tree data`);
  }

  // Leaf node (no children) - return node width
  if (!node.options || node.options.length === 0) {
    return constants.nodeWidth;
  }

  // For parent nodes, calculate width based on immediate children count
  const numChildren = node.options.length;

  // Total width = number of children * nodeWidth + gaps between them
  const totalChildWidth = numChildren * constants.nodeWidth;
  const gapWidth = (numChildren - 1) * constants.siblingGap;
  const childrenTotalWidth = totalChildWidth + gapWidth;

  // Return the larger of parent width or children total width
  return Math.max(constants.nodeWidth, childrenTotalWidth);
}

/**
 * Calculate the height required for a node based on its immediate children.
 * This represents the vertical space needed for the children layer (left-to-right layout).
 *
 * @param nodeId - The ID of the node to calculate height for
 * @param data - The tree data structure
 * @param constants - Layout constants defining spacing and dimensions
 * @returns The height required for the node's immediate children
 * @throws Error if node is not found in data
 */
export function calculateSubtreeHeight(
  nodeId: string,
  data: TreeData,
  constants: LayoutConstants
): number {
  const node = data[nodeId];

  if (!node) {
    throw new Error(`Node with id '${nodeId}' not found in tree data`);
  }

  // Leaf node (no children) - return node height
  if (!node.options || node.options.length === 0) {
    return constants.nodeHeight;
  }

  // For parent nodes, calculate height based on immediate children count
  // Children stack vertically in left-to-right layout
  const numChildren = node.options.length;

  // Total height = number of children * nodeHeight + gaps between them
  const totalChildHeight = numChildren * constants.nodeHeight;
  const gapHeight = (numChildren - 1) * constants.siblingGap;  // Siblings use siblingGap
  const childrenTotalHeight = totalChildHeight + gapHeight;

  // Return the larger of parent height or children total height
  return Math.max(constants.nodeHeight, childrenTotalHeight);
}

/**
 * Helper function to recursively calculate the full subtree width for positioning.
 * This accounts for all descendants, unlike calculateSubtreeWidth which only counts immediate children.
 */
function calculateFullSubtreeWidth(
  nodeId: string,
  data: TreeData,
  constants: LayoutConstants
): number {
  const node = data[nodeId];

  if (!node) {
    return constants.nodeWidth;
  }

  // Leaf node - return node width
  if (!node.options || node.options.length === 0) {
    return constants.nodeWidth;
  }

  // Get child node IDs
  const childNodeIds = node.options.map(option => option.nextNodeId);

  // Recursively calculate width for each child subtree
  const childWidths = childNodeIds.map(childId =>
    calculateFullSubtreeWidth(childId, data, constants)
  );

  // Total width = sum of all child widths + gaps
  const totalChildWidth = childWidths.reduce((sum, width) => sum + width, 0);
  const gapWidth = (childWidths.length - 1) * constants.siblingGap;
  const childrenTotalWidth = totalChildWidth + gapWidth;

  return Math.max(constants.nodeWidth, childrenTotalWidth);
}

/**
 * Phase 3: Helper function to recursively calculate the full subtree HEIGHT for positioning.
 * This accounts for all descendants, unlike calculateSubtreeHeight which only counts immediate children.
 */
function calculateFullSubtreeHeight(
  nodeId: string,
  data: TreeData,
  constants: LayoutConstants
): number {
  const node = data[nodeId];

  if (!node) {
    return constants.nodeHeight;
  }

  // Leaf node - return node height
  if (!node.options || node.options.length === 0) {
    return constants.nodeHeight;
  }

  // Get child node IDs
  const childNodeIds = node.options.map(option => option.nextNodeId);

  // Recursively calculate height for each child subtree
  const childHeights = childNodeIds.map(childId =>
    calculateFullSubtreeHeight(childId, data, constants)
  );

  // Total height = sum of all child heights + gaps (vertical stacking)
  const totalChildHeight = childHeights.reduce((sum, height) => sum + height, 0);
  const gapHeight = (childHeights.length - 1) * constants.siblingGap;  // Siblings use siblingGap
  const childrenTotalHeight = totalChildHeight + gapHeight;

  return Math.max(constants.nodeHeight, childrenTotalHeight);
}

/**
 * Phase 3: Recursively position all nodes in the tree with optimal spacing.
 * LEFT-TO-RIGHT LAYOUT: Tree flows horizontally (root on left, leaves on right)
 *
 * @param nodeId - The ID of the node to position
 * @param data - The tree data structure
 * @param x - The X coordinate for this node (horizontal position, increases with depth)
 * @param centerY - The Y coordinate to center this node at (vertical centering)
 * @param level - The depth level of this node (0 for root)
 * @param constants - Layout constants defining spacing and dimensions
 * @returns A LayoutNode with calculated positions for the node and all descendants
 * @throws Error if node is not found in data
 */
export function calculateNodePositions(
  nodeId: string,
  data: TreeData,
  x: number,
  centerY: number,
  level: number,
  constants: LayoutConstants
): LayoutNode {
  const node = data[nodeId];

  if (!node) {
    throw new Error(`Node with id '${nodeId}' not found in tree data`);
  }

  // Phase 3: Calculate this node's position (centered at centerY)
  const y = centerY - constants.nodeHeight / 2;

  // Create the layout node
  const layoutNode: LayoutNode = {
    id: nodeId,
    x,
    y,
    width: constants.nodeWidth,
    height: constants.nodeHeight,
    level,
    children: [],
  };

  // If this is a leaf node, return early
  if (!node.options || node.options.length === 0) {
    return layoutNode;
  }

  // Get unique child node IDs
  const childNodeIds = node.options.map(option => option.nextNodeId);

  // Phase 3: Calculate FULL subtree HEIGHTS for each child (for proper vertical positioning)
  const childHeights = childNodeIds.map(childId =>
    calculateFullSubtreeHeight(childId, data, constants)
  );

  // Phase 3: Calculate total HEIGHT needed for all children
  const totalChildHeight = childHeights.reduce((sum, height) => sum + height, 0);
  const gapHeight = (childHeights.length - 1) * constants.siblingGap;
  const childrenTotalHeight = totalChildHeight + gapHeight;

  // Phase 3: Start position for the first child (topmost)
  // Center the children group vertically around the parent's center
  let currentY = centerY - childrenTotalHeight / 2;

  // Phase 3: Position each child - they progress horizontally and distribute vertically
  const childX = x + constants.levelGap;  // Children move right
  const childLevel = level + 1;

  childNodeIds.forEach((childId, index) => {
    const childHeight = childHeights[index];
    const childCenterY = currentY + childHeight / 2;

    // Recursively calculate positions for this child
    const childLayout = calculateNodePositions(
      childId,
      data,
      childX,
      childCenterY,
      childLevel,
      constants
    );

    layoutNode.children.push(childLayout);

    // Phase 3: Move to next child position (move down vertically)
    currentY += childHeight + constants.siblingGap;
  });

  return layoutNode;
}

// Phase 2: Curved Arrow Support

/**
 * Arrow styling constants for visual hierarchy
 */
const ARROW_STYLES = {
  LEVEL_1_2: {
    color: 'black',
    dash: 'solid' as const,
    arrowheadEnd: 'arrow',
  },
  LEVEL_3: {
    color: 'violet',
    dash: 'solid' as const,
    arrowheadEnd: 'arrow',
  },
  LEVEL_4: {
    color: 'blue',
    dash: 'dashed' as const,
    arrowheadEnd: 'triangle',
  },
  LEVEL_5_PLUS: {
    color: 'grey',
    dash: 'dashed' as const,
    arrowheadEnd: 'dot',
  },
} as const;

// Bend calculation constants
const BEND_MULTIPLIER = 0.15;
const MAX_BEND = 80;

/**
 * Calculate the bend amount for curved arrows based on sibling position.
 *
 * @param siblingIndex - Zero-based index of the sibling (0 = leftmost)
 * @param totalSiblings - Total number of siblings
 * @param horizontalDistance - Horizontal distance between parent and child
 * @returns Bend amount (-80 to 80). Negative = counter-clockwise, Positive = clockwise
 *
 * @example
 * // Single child - no bend
 * calculateArrowBend(0, 1, 200) // => 0
 *
 * @example
 * // Leftmost of 3 siblings - negative bend
 * calculateArrowBend(0, 3, 200) // => -15
 *
 * @example
 * // Rightmost of 3 siblings - positive bend
 * calculateArrowBend(2, 3, 200) // => 15
 */
export function calculateArrowBend(
  siblingIndex: number,
  totalSiblings: number,
  horizontalDistance: number
): number {
  // Single child - straight arrow
  if (totalSiblings === 1) {
    return 0;
  }

  // Zero horizontal distance - straight arrow
  if (horizontalDistance === 0) {
    return 0;
  }

  // Calculate normalized position from -0.5 (leftmost) to +0.5 (rightmost)
  // Middle child(ren) will be at or near 0
  const normalizedPosition = (siblingIndex / (totalSiblings - 1)) - 0.5;

  // Calculate base bend based on horizontal distance
  // Use absolute value to handle negative distances
  const baseBend = Math.abs(horizontalDistance) * BEND_MULTIPLIER;

  // Apply normalized position to base bend
  const bend = normalizedPosition * baseBend;

  // Cap the final bend value at ±MAX_BEND
  return Math.max(-MAX_BEND, Math.min(MAX_BEND, bend));
}

/**
 * Get arrow styling based on tree level for visual hierarchy.
 *
 * @param level - Tree level (1-based, where 1 is root)
 * @returns Arrow style configuration
 *
 * @example
 * // Level 1-2: black, solid, arrow
 * getArrowStyle(1) // => { color: 'black', dash: 'solid', arrowheadEnd: 'arrow' }
 *
 * @example
 * // Level 3: violet, solid, arrow
 * getArrowStyle(3) // => { color: 'violet', dash: 'solid', arrowheadEnd: 'arrow' }
 *
 * @example
 * // Level 4: blue, dashed, triangle
 * getArrowStyle(4) // => { color: 'blue', dash: 'dashed', arrowheadEnd: 'triangle' }
 *
 * @example
 * // Level 5+: grey, dashed, dot
 * getArrowStyle(5) // => { color: 'grey', dash: 'dashed', arrowheadEnd: 'dot' }
 */
export function getArrowStyle(level: number): {
  color: string;
  dash: 'solid' | 'dashed';
  arrowheadEnd: string;
} {
  // Handle invalid levels (0 or negative) as level 1
  if (level <= 0) {
    return ARROW_STYLES.LEVEL_1_2;
  }

  // Level 1-2: black, solid, arrow
  if (level <= 2) {
    return ARROW_STYLES.LEVEL_1_2;
  }

  // Level 3: violet, solid, arrow
  if (level === 3) {
    return ARROW_STYLES.LEVEL_3;
  }

  // Level 4: blue, dashed, triangle
  if (level === 4) {
    return ARROW_STYLES.LEVEL_4;
  }

  // Level 5+: grey, dashed, dot
  return ARROW_STYLES.LEVEL_5_PLUS;
}

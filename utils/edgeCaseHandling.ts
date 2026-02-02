/**
 * Edge Case Handling Utilities (Phase 8)
 *
 * Functions for handling cascade collapse, debouncing, and viewport bounds
 */

import { TreeData } from '../types';
import { getAllDescendants } from './expansionState';

/**
 * Collapse a node and all its descendants
 * @param nodeId - Node to collapse
 * @param expandedNodes - Current set of expanded nodes
 * @param data - Tree data structure
 * @returns New Set with node and descendants removed (immutable)
 */
export function cascadeCollapseDescendants(
  nodeId: string,
  expandedNodes: Set<string>,
  data: TreeData
): Set<string> {
  const newSet = new Set(expandedNodes);

  // Remove the node itself
  newSet.delete(nodeId);

  // Get all descendants and remove them
  const descendants = getAllDescendants(nodeId, data);
  descendants.forEach(descendantId => {
    newSet.delete(descendantId);
  });

  return newSet;
}

/**
 * Create a debounced function that delays execution
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function createDebouncer<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function(...args: Parameters<T>) {
    // Clear previous timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Bounds interface for viewport and nodes
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  center: { x: number; y: number };
}

/**
 * Check if a node is within the viewport bounds
 * @param nodeBounds - Node boundaries
 * @param viewportBounds - Viewport boundaries
 * @returns True if node is visible (any part overlapping)
 */
export function isWithinViewport(
  nodeBounds: Bounds,
  viewportBounds: Bounds
): boolean {
  // Check if there's any overlap between node and viewport
  // No overlap if:
  // - node is completely to the right of viewport
  // - node is completely to the left of viewport
  // - node is completely below viewport
  // - node is completely above viewport

  const isOutsideRight = nodeBounds.minX >= viewportBounds.maxX;
  const isOutsideLeft = nodeBounds.maxX <= viewportBounds.minX;
  const isOutsideBelow = nodeBounds.minY >= viewportBounds.maxY;
  const isOutsideAbove = nodeBounds.maxY <= viewportBounds.minY;

  // If any of these conditions is true, node is completely outside
  if (isOutsideRight || isOutsideLeft || isOutsideBelow || isOutsideAbove) {
    return false;
  }

  return true;
}

/**
 * Calculate adjusted viewport to ensure node is visible
 * @param nodeBounds - Node boundaries
 * @param viewportBounds - Current viewport
 * @param padding - Padding around node (default 100)
 * @returns Adjusted viewport bounds
 */
export function ensureNodeInViewport(
  nodeBounds: Bounds,
  viewportBounds: Bounds,
  padding: number = 100
): Bounds {
  // If node is already fully visible, return current viewport
  if (isWithinViewport(nodeBounds, viewportBounds)) {
    // Check if node is fully contained (not just partially visible)
    const fullyContained =
      nodeBounds.minX >= viewportBounds.minX &&
      nodeBounds.maxX <= viewportBounds.maxX &&
      nodeBounds.minY >= viewportBounds.minY &&
      nodeBounds.maxY <= viewportBounds.maxY;

    if (fullyContained) {
      return viewportBounds;
    }
  }

  // Calculate new viewport center that includes the node with padding
  const targetCenterX = nodeBounds.center.x;
  const targetCenterY = nodeBounds.center.y;

  // Calculate new bounds with padding
  const newMinX = nodeBounds.minX - padding;
  const newMinY = nodeBounds.minY - padding;
  const newMaxX = nodeBounds.maxX + padding;
  const newMaxY = nodeBounds.maxY + padding;

  return {
    x: newMinX,
    y: newMinY,
    width: newMaxX - newMinX,
    height: newMaxY - newMinY,
    minX: newMinX,
    minY: newMinY,
    maxX: newMaxX,
    maxY: newMaxY,
    center: { x: targetCenterX, y: targetCenterY }
  };
}

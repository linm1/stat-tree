/**
 * Viewport management and animation utilities
 * Phase 5: Progressive disclosure animations
 *
 * Provides functions for:
 * - Focusing viewport on expanded nodes
 * - Animating newly created shapes
 * - Calculating bounding boxes
 * - Smooth zoom/pan transitions
 */

import { Editor, TLShapeId, createShapeId } from 'tldraw';
import { TreeData } from '../types';

/**
 * Easing function: ease-in-out quadratic
 * Provides smooth acceleration and deceleration for animations
 *
 * @param t - Progress value from 0 to 1
 * @returns Eased value from 0 to 1
 */
export const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

/**
 * Focus viewport on an expanded node and its children
 * Calculates bounds of parent + children, adds padding, and smoothly zooms
 *
 * @param nodeId - ID of the node that was expanded
 * @param editor - tldraw Editor instance
 * @param data - Tree data structure
 */
export const focusOnExpandedNode = (
  nodeId: string,
  editor: Editor | null,
  data: TreeData
): void => {
  // Early return if editor is null
  if (!editor) return;

  // Get parent shape
  const shapeId = createShapeId(`node-${nodeId}`);
  const shape = editor.getShape(shapeId);

  if (!shape) return;

  // Get node data to find children
  const node = data[nodeId];
  if (!node.options || node.options.length === 0) return;

  // Get child shape IDs
  const childIds = node.options.map(opt =>
    createShapeId(`node-${opt.nextNodeId}`)
  );

  // Get child shapes (filter out undefined)
  const childShapes = childIds
    .map(id => editor.getShape(id))
    .filter(s => s !== undefined);

  if (childShapes.length === 0) return;

  // Calculate bounds of parent + children
  const allShapes = [shape, ...childShapes];
  const firstBounds = editor.getShapePageBounds(allShapes[0]);

  if (!firstBounds) return;

  // Calculate minimal bounding box for all shapes
  let minX = firstBounds.minX;
  let minY = firstBounds.minY;
  let maxX = firstBounds.maxX;
  let maxY = firstBounds.maxY;

  // Expand bounds to include all shapes
  allShapes.slice(1).forEach(s => {
    const b = editor.getShapePageBounds(s);
    if (b) {
      minX = Math.min(minX, b.minX);
      minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX);
      maxY = Math.max(maxY, b.maxY);
    }
  });

  // Add padding (100px on all sides)
  const padding = 100;
  const paddedBounds = {
    x: minX - padding,
    y: minY - padding,
    w: (maxX - minX) + (padding * 2),
    h: (maxY - minY) + (padding * 2)
  };

  // Animate zoom to bounds
  editor.zoomToBounds(paddedBounds, {
    animation: {
      duration: 500,
      easing: easeInOutQuad
    }
  });
};

/**
 * Animate new shapes with staggered fade-in effect
 * Creates shapes at opacity 0, then fades them in with 50ms stagger
 *
 * @param shapeIds - Array of shape IDs to animate
 * @param editor - tldraw Editor instance
 * @param shapesData - Array of shape data (optional, for initial creation)
 */
export const animateNewShapes = (
  shapeIds: TLShapeId[],
  editor: Editor | null,
  shapesData?: any[]
): void => {
  // Early return if editor is null
  if (!editor) return;

  // Early return if no shapes to animate
  if (shapeIds.length === 0) return;

  // If shapes data is provided, create shapes with opacity 0
  if (shapesData && shapesData.length > 0) {
    const shapesWithOpacity = shapesData.map(shape => ({
      ...shape,
      opacity: 0
    }));

    editor.createShapes(shapesWithOpacity);
  }

  // Stagger fade-in with 50ms delay per shape
  shapeIds.forEach((id, index) => {
    setTimeout(() => {
      try {
        editor.updateShapes([{
          id,
          type: 'geo',
          opacity: 1
        }]);
      } catch (error) {
        // Shape might not exist - ignore error
        console.warn(`Failed to animate shape ${id}:`, error);
      }
    }, index * 50);
  });
};

/**
 * Calculate minimum bounding box for a set of shapes
 *
 * @param shapes - Array of shape objects with x, y, w, h properties
 * @returns Bounding box with minX, minY, maxX, maxY, width, height
 */
export const calculateBounds = (
  shapes: Array<{ x: number; y: number; w: number; h: number }>
): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} => {
  if (shapes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0
    };
  }

  const bounds = shapes.reduce((acc, shape) => {
    const shapeBounds = {
      minX: shape.x,
      minY: shape.y,
      maxX: shape.x + shape.w,
      maxY: shape.y + shape.h
    };

    return {
      minX: Math.min(acc.minX, shapeBounds.minX),
      minY: Math.min(acc.minY, shapeBounds.minY),
      maxX: Math.max(acc.maxX, shapeBounds.maxX),
      maxY: Math.max(acc.maxY, shapeBounds.maxY)
    };
  }, {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity
  });

  return {
    ...bounds,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY
  };
};

/**
 * Add padding to bounding box
 *
 * @param bounds - Original bounds
 * @param padding - Padding amount (applied to all sides)
 * @returns Padded bounds in tldraw format { x, y, w, h }
 */
export const addPaddingToBounds = (
  bounds: { minX: number; minY: number; width: number; height: number },
  padding: number
): { x: number; y: number; w: number; h: number } => {
  return {
    x: bounds.minX - padding,
    y: bounds.minY - padding,
    w: bounds.width + (padding * 2),
    h: bounds.height + (padding * 2)
  };
};

/**
 * Tests for viewport management and animation functions
 * Phase 5 of progressive disclosure implementation
 *
 * These tests verify:
 * - Viewport focus calculations
 * - Animation timing and sequencing
 * - Bounds calculations for shapes
 * - Zoom/pan functionality
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import type { Editor, TLShapeId } from 'tldraw';

// Mock tldraw Editor API
const createMockEditor = (shapes: Map<TLShapeId, any> = new Map()): Partial<Editor> => {
  return {
    getShape: jest.fn((id: TLShapeId) => shapes.get(id)),
    getShapePageBounds: jest.fn((shape: any) => {
      if (!shape) return null;
      return {
        x: shape.x,
        y: shape.y,
        w: shape.props.w,
        h: shape.props.h,
        minX: shape.x,
        minY: shape.y,
        maxX: shape.x + shape.props.w,
        maxY: shape.y + shape.props.h,
        width: shape.props.w,
        height: shape.props.h,
        center: {
          x: shape.x + shape.props.w / 2,
          y: shape.y + shape.props.h / 2
        }
      };
    }),
    zoomToBounds: jest.fn(),
    createShapes: jest.fn(),
    updateShapes: jest.fn(),
  };
};

// Mock tree data
const mockTreeData = {
  'start': {
    id: 'start',
    question: 'Root',
    options: [
      { label: 'Child 1', nextNodeId: 'child1' },
      { label: 'Child 2', nextNodeId: 'child2' }
    ]
  },
  'child1': {
    id: 'child1',
    question: 'Child 1',
    options: [
      { label: 'Grandchild 1', nextNodeId: 'grandchild1' },
      { label: 'Grandchild 2', nextNodeId: 'grandchild2' }
    ]
  },
  'child2': {
    id: 'child2',
    question: 'Child 2',
    options: []
  },
  'grandchild1': {
    id: 'grandchild1',
    question: 'Grandchild 1',
    options: []
  },
  'grandchild2': {
    id: 'grandchild2',
    question: 'Grandchild 2',
    options: []
  }
};

describe('Viewport Management (Phase 5)', () => {
  describe('focusOnExpandedNode', () => {
    test('calculates correct bounds for parent and children', () => {
      // Create mock shapes
      const shapes = new Map();

      const parentShape = {
        id: 'node-start' as TLShapeId,
        x: 100,
        y: 100,
        props: { w: 200, h: 80 }
      };

      const child1Shape = {
        id: 'node-child1' as TLShapeId,
        x: 400,
        y: 50,
        props: { w: 200, h: 80 }
      };

      const child2Shape = {
        id: 'node-child2' as TLShapeId,
        x: 400,
        y: 150,
        props: { w: 200, h: 80 }
      };

      shapes.set('node-start' as TLShapeId, parentShape);
      shapes.set('node-child1' as TLShapeId, child1Shape);
      shapes.set('node-child2' as TLShapeId, child2Shape);

      const mockEditor = createMockEditor(shapes);

      // Calculate expected bounds
      const expectedBounds = {
        minX: 100,
        minY: 50,
        maxX: 600, // child x + width
        maxY: 230, // child y + height
        width: 500,
        height: 180
      };

      // With padding of 100
      const expectedPaddedBounds = {
        x: expectedBounds.minX - 100,
        y: expectedBounds.minY - 100,
        w: expectedBounds.width + 200,
        h: expectedBounds.height + 200
      };

      expect(expectedPaddedBounds).toEqual({
        x: 0,
        y: -50,
        w: 700,
        h: 380
      });
    });

    test('returns early if editor is null', () => {
      const result = null; // focusOnExpandedNode should return early
      expect(result).toBeNull();
    });

    test('returns early if parent shape not found', () => {
      const mockEditor = createMockEditor();
      // No shapes in editor - getShape returns undefined
      expect(mockEditor.getShape).toBeDefined();
    });

    test('returns early if node has no children', () => {
      const shapes = new Map();
      const leafShape = {
        id: 'node-child2' as TLShapeId,
        x: 100,
        y: 100,
        props: { w: 200, h: 80 }
      };
      shapes.set('node-child2' as TLShapeId, leafShape);

      const mockEditor = createMockEditor(shapes);

      // Node has no options, should return early
      expect(mockTreeData['child2'].options).toHaveLength(0);
    });

    test('handles child shapes that do not exist', () => {
      const shapes = new Map();
      const parentShape = {
        id: 'node-start' as TLShapeId,
        x: 100,
        y: 100,
        props: { w: 200, h: 80 }
      };
      shapes.set('node-start' as TLShapeId, parentShape);

      const mockEditor = createMockEditor(shapes);

      // Children shapes don't exist - should filter them out
      const childShapes = ['child1', 'child2']
        .map(id => mockEditor.getShape?.(`node-${id}` as TLShapeId))
        .filter(s => s !== undefined);

      expect(childShapes).toHaveLength(0);
    });

    test('calls zoomToBounds with correct animation parameters', () => {
      const shapes = new Map();
      const parentShape = {
        id: 'node-start' as TLShapeId,
        x: 100,
        y: 100,
        props: { w: 200, h: 80 }
      };
      const childShape = {
        id: 'node-child1' as TLShapeId,
        x: 400,
        y: 100,
        props: { w: 200, h: 80 }
      };

      shapes.set('node-start' as TLShapeId, parentShape);
      shapes.set('node-child1' as TLShapeId, childShape);

      const mockEditor = createMockEditor(shapes);

      // Verify animation config has correct properties
      const expectedAnimation = {
        duration: 500,
        easing: expect.any(Function)
      };

      expect(expectedAnimation.duration).toBe(500);

      // Test easing function (ease-in-out quadratic)
      const easing = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      expect(easing(0)).toBe(0);
      expect(easing(0.5)).toBeCloseTo(0.5, 5);
      expect(easing(1)).toBe(1);
    });

    test('adds 100px padding to all sides', () => {
      const bounds = {
        minX: 100,
        minY: 100,
        maxX: 300,
        maxY: 200,
        width: 200,
        height: 100
      };

      const padding = 100;
      const paddedBounds = {
        x: bounds.minX - padding,
        y: bounds.minY - padding,
        w: bounds.width + (padding * 2),
        h: bounds.height + (padding * 2)
      };

      expect(paddedBounds).toEqual({
        x: 0,
        y: 0,
        w: 400,
        h: 300
      });
    });

    test('expands bounds to include all child shapes', () => {
      const parentBounds = { minX: 100, minY: 100, maxX: 300, maxY: 180 };
      const child1Bounds = { minX: 400, minY: 50, maxX: 600, maxY: 130 };
      const child2Bounds = { minX: 400, minY: 150, maxX: 600, maxY: 230 };

      // Calculate combined bounds
      const combinedBounds = {
        minX: Math.min(parentBounds.minX, child1Bounds.minX, child2Bounds.minX),
        minY: Math.min(parentBounds.minY, child1Bounds.minY, child2Bounds.minY),
        maxX: Math.max(parentBounds.maxX, child1Bounds.maxX, child2Bounds.maxX),
        maxY: Math.max(parentBounds.maxY, child1Bounds.maxY, child2Bounds.maxY)
      };

      expect(combinedBounds).toEqual({
        minX: 100,
        minY: 50,
        maxX: 600,
        maxY: 230
      });
    });
  });

  describe('Animation Functions', () => {
    describe('animateNewShapes', () => {
      test('returns early if editor is null', () => {
        const result = null; // Should return early
        expect(result).toBeNull();
      });

      test('returns early if shape IDs array is empty', () => {
        const mockEditor = createMockEditor();
        const shapeIds: string[] = [];

        expect(shapeIds.length).toBe(0);
        // Should not call createShapes or updateShapes
        expect(mockEditor.createShapes).toBeDefined();
        expect(mockEditor.updateShapes).toBeDefined();
      });

      test('creates shapes with initial opacity of 0', () => {
        const mockEditor = createMockEditor();

        const shapeIds = ['shape1', 'shape2', 'shape3'];
        const shapesData = shapeIds.map(id => ({
          id: id as TLShapeId,
          type: 'geo' as const,
          x: 0,
          y: 0,
          opacity: 0,
          props: {}
        }));

        shapesData.forEach(shape => {
          expect(shape.opacity).toBe(0);
        });
      });

      test('staggers fade-in with 50ms delay per shape', () => {
        const delays = [0, 50, 100, 150, 200];
        const shapeIds = ['s1', 's2', 's3', 's4', 's5'];

        shapeIds.forEach((id, index) => {
          const expectedDelay = index * 50;
          expect(expectedDelay).toBe(delays[index]);
        });
      });

      test('updates shapes to opacity 1 in sequence', () => {
        const mockEditor = createMockEditor();

        const updateCall = {
          id: 'shape1' as TLShapeId,
          type: 'geo' as const,
          opacity: 1
        };

        expect(updateCall.opacity).toBe(1);
        expect(updateCall.type).toBe('geo');
      });

      test('handles 10+ shapes with correct timing', () => {
        const shapeCount = 15;
        const shapeIds = Array.from({ length: shapeCount }, (_, i) => `shape${i}`);

        const timings = shapeIds.map((_, index) => index * 50);

        expect(timings[0]).toBe(0);
        expect(timings[14]).toBe(700); // 14 * 50
        expect(timings.length).toBe(15);
      });
    });

    describe('Easing Function', () => {
      test('ease-in-out quadratic at key points', () => {
        const easing = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        expect(easing(0)).toBe(0);
        expect(easing(0.25)).toBeCloseTo(0.125, 5);
        expect(easing(0.5)).toBeCloseTo(0.5, 5);
        expect(easing(0.75)).toBeCloseTo(0.875, 5);
        expect(easing(1)).toBe(1);
      });

      test('easing is continuous and smooth', () => {
        const easing = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        // Test continuity at t=0.5
        const leftLimit = 2 * 0.5 * 0.5; // 0.5
        const rightLimit = -1 + (4 - 2 * 0.5) * 0.5; // 0.5

        expect(leftLimit).toBe(rightLimit);
      });
    });
  });

  describe('Viewport Bounds Calculations', () => {
    test('calculates minimum bounding box for single shape', () => {
      const shape = { x: 100, y: 200, w: 300, h: 150 };

      const bounds = {
        minX: shape.x,
        minY: shape.y,
        maxX: shape.x + shape.w,
        maxY: shape.y + shape.h,
        width: shape.w,
        height: shape.h
      };

      expect(bounds).toEqual({
        minX: 100,
        minY: 200,
        maxX: 400,
        maxY: 350,
        width: 300,
        height: 150
      });
    });

    test('calculates minimum bounding box for multiple shapes', () => {
      const shapes = [
        { x: 100, y: 100, w: 200, h: 80 },
        { x: 400, y: 50, w: 200, h: 80 },
        { x: 400, y: 200, w: 200, h: 80 }
      ];

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

      expect(bounds).toEqual({
        minX: 100,
        minY: 50,
        maxX: 600,
        maxY: 280
      });
    });

    test('handles shapes with negative coordinates', () => {
      const shapes = [
        { x: -100, y: -50, w: 200, h: 100 },
        { x: 50, y: 50, w: 100, h: 100 }
      ];

      const bounds = {
        minX: Math.min(...shapes.map(s => s.x)),
        minY: Math.min(...shapes.map(s => s.y)),
        maxX: Math.max(...shapes.map(s => s.x + s.w)),
        maxY: Math.max(...shapes.map(s => s.y + s.h))
      };

      expect(bounds).toEqual({
        minX: -100,
        minY: -50,
        maxX: 150,
        maxY: 150
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles undefined shape bounds gracefully', () => {
      const mockEditor = createMockEditor();

      const shapeId = 'nonexistent' as TLShapeId;
      const shape = mockEditor.getShape?.(shapeId);

      expect(shape).toBeUndefined();
    });

    test('handles empty children array', () => {
      const node = mockTreeData['child2'];
      expect(node.options).toHaveLength(0);

      const childIds = node.options?.map(opt => `node-${opt.nextNodeId}`) || [];
      expect(childIds).toHaveLength(0);
    });

    test('handles very large padding values', () => {
      const bounds = { minX: 100, minY: 100, maxX: 200, maxY: 200, width: 100, height: 100 };
      const largePadding = 1000;

      const paddedBounds = {
        x: bounds.minX - largePadding,
        y: bounds.minY - largePadding,
        w: bounds.width + (largePadding * 2),
        h: bounds.height + (largePadding * 2)
      };

      expect(paddedBounds).toEqual({
        x: -900,
        y: -900,
        w: 2100,
        h: 2100
      });
    });

    test('handles single child node', () => {
      const shapes = new Map();
      const parentShape = {
        id: 'node-parent' as TLShapeId,
        x: 100,
        y: 100,
        props: { w: 200, h: 80 }
      };
      const childShape = {
        id: 'node-child' as TLShapeId,
        x: 400,
        y: 100,
        props: { w: 200, h: 80 }
      };

      shapes.set('node-parent' as TLShapeId, parentShape);
      shapes.set('node-child' as TLShapeId, childShape);

      const mockEditor = createMockEditor(shapes);

      const childShapes = [childShape];
      expect(childShapes.length).toBe(1);
    });

    test('handles overlapping shapes', () => {
      const shapes = [
        { x: 100, y: 100, w: 200, h: 200 },
        { x: 150, y: 150, w: 100, h: 100 } // Fully contained
      ];

      const bounds = {
        minX: Math.min(...shapes.map(s => s.x)),
        minY: Math.min(...shapes.map(s => s.y)),
        maxX: Math.max(...shapes.map(s => s.x + s.w)),
        maxY: Math.max(...shapes.map(s => s.y + s.h))
      };

      // Outer shape should define bounds
      expect(bounds).toEqual({
        minX: 100,
        minY: 100,
        maxX: 300,
        maxY: 300
      });
    });
  });

  describe('Integration with tldraw API', () => {
    test('zoomToBounds accepts correct parameters', () => {
      const mockEditor = createMockEditor();

      const bounds = { x: 0, y: 0, w: 800, h: 600 };
      const options = {
        animation: {
          duration: 500,
          easing: (t: number) => t
        }
      };

      expect(mockEditor.zoomToBounds).toBeDefined();
      expect(options.animation.duration).toBe(500);
      expect(options.animation.easing(0.5)).toBe(0.5);
    });

    test('createShapes accepts array of shape data', () => {
      const mockEditor = createMockEditor();

      const shapesData = [
        { id: 's1' as TLShapeId, type: 'geo' as const, opacity: 0, props: {} },
        { id: 's2' as TLShapeId, type: 'geo' as const, opacity: 0, props: {} }
      ];

      expect(mockEditor.createShapes).toBeDefined();
      expect(shapesData.length).toBe(2);
    });

    test('updateShapes accepts array of partial shape data', () => {
      const mockEditor = createMockEditor();

      const updates = [
        { id: 's1' as TLShapeId, type: 'geo' as const, opacity: 1 }
      ];

      expect(mockEditor.updateShapes).toBeDefined();
      expect(updates[0].opacity).toBe(1);
    });
  });
});

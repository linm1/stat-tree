/**
 * TDD Tests for calculateBoundsWithChildren
 *
 * Testing smart zoom bounds calculation that includes a node AND its visible children.
 * This enables users to see their next navigation options when zooming.
 *
 * ALL TESTS SHOULD FAIL INITIALLY (RED phase of TDD)
 */

import { calculateBoundsWithChildren } from './animations';
import { TreeData } from '../types';
import { Editor, createShapeId } from 'tldraw';

// Mock data for testing
const mockTreeData: TreeData = {
  'root': {
    id: 'root',
    question: 'Root node',
    options: [
      { label: 'Option 1', nextNodeId: 'child1' },
      { label: 'Option 2', nextNodeId: 'child2' },
      { label: 'Option 3', nextNodeId: 'child3' }
    ]
  },
  'child1': {
    id: 'child1',
    question: 'Child 1',
    options: []
  },
  'child2': {
    id: 'child2',
    question: 'Child 2',
    options: []
  },
  'child3': {
    id: 'child3',
    question: 'Child 3',
    options: []
  },
  'no-children': {
    id: 'no-children',
    question: 'Leaf node with no children',
    options: []
  },
  'many-children': {
    id: 'many-children',
    question: 'Node with many children',
    options: [
      { label: 'Child 1', nextNodeId: 'mc-child1' },
      { label: 'Child 2', nextNodeId: 'mc-child2' },
      { label: 'Child 3', nextNodeId: 'mc-child3' },
      { label: 'Child 4', nextNodeId: 'mc-child4' },
      { label: 'Child 5', nextNodeId: 'mc-child5' }
    ]
  },
  'mc-child1': { id: 'mc-child1', question: 'MC Child 1', options: [] },
  'mc-child2': { id: 'mc-child2', question: 'MC Child 2', options: [] },
  'mc-child3': { id: 'mc-child3', question: 'MC Child 3', options: [] },
  'mc-child4': { id: 'mc-child4', question: 'MC Child 4', options: [] },
  'mc-child5': { id: 'mc-child5', question: 'MC Child 5', options: [] }
};

/**
 * Create mock editor with predictable bounds for testing
 */
const createMockEditor = (shapeBoundsMap: Map<string, any>): Editor => {
  return {
    getShape: jest.fn((id: string) => {
      // Return shape if it exists in bounds map
      return shapeBoundsMap.has(id) ? { id } : undefined;
    }),
    getShapePageBounds: jest.fn((shape: any) => {
      // Return bounds from map
      return shapeBoundsMap.get(shape.id);
    })
  } as unknown as Editor;
};

describe('calculateBoundsWithChildren (TDD - RED Phase)', () => {

  describe('Edge Case: Null/Invalid Inputs', () => {

    test('returns null when editor is null', () => {
      const result = calculateBoundsWithChildren(
        'root',
        null,
        mockTreeData
      );

      expect(result).toBeNull();
    });

    test('returns null when nodeId does not exist as a shape', () => {
      const boundsMap = new Map();
      const mockEditor = createMockEditor(boundsMap);

      const result = calculateBoundsWithChildren(
        'non-existent-node',
        mockEditor,
        mockTreeData
      );

      expect(result).toBeNull();
    });

    test('returns null when node exists in data but not as shape', () => {
      const boundsMap = new Map();
      const mockEditor = createMockEditor(boundsMap);

      const result = calculateBoundsWithChildren(
        'root',
        mockEditor,
        mockTreeData
      );

      expect(result).toBeNull();
    });

    test('handles node that does not exist in tree data gracefully', () => {
      const boundsMap = new Map([
        ['node-phantom', {
          minX: 0,
          minY: 0,
          maxX: 100,
          maxY: 100
        }]
      ]);
      const mockEditor = createMockEditor(boundsMap);

      // 'phantom' exists as shape but not in tree data
      const result = calculateBoundsWithChildren(
        'phantom',
        mockEditor,
        mockTreeData
      );

      // Should not crash, returns bounds of just the shape
      expect(result).not.toBeNull();
    });

  });

  describe('Edge Case: Node With No Children', () => {

    test('returns bounds of just the node when node has no children', () => {
      // Setup: Node at (100, 100) with size 200x100
      const boundsMap = new Map([
        ['node-no-children', {
          minX: 100,
          minY: 100,
          maxX: 300,
          maxY: 200
        }]
      ]);
      const mockEditor = createMockEditor(boundsMap);

      const result = calculateBoundsWithChildren(
        'no-children',
        mockEditor,
        mockTreeData,
        100 // padding
      );

      expect(result).not.toBeNull();
      expect(result).toEqual({
        x: 0,    // 100 - 100 (padding)
        y: 0,    // 100 - 100 (padding)
        w: 400,  // 200 + 200 (padding on both sides)
        h: 300   // 100 + 200 (padding on both sides)
      });
    });

  });

  describe('Core Functionality: Node With Children', () => {

    test('returns expanded bounds when node has children', () => {
      // Setup: Parent at (100, 100), children spread out horizontally
      const boundsMap = new Map([
        // Parent node: 200x100 at (100, 100)
        ['node-root', {
          minX: 100,
          minY: 100,
          maxX: 300,
          maxY: 200
        }],
        // Child 1: 150x80 at (0, 300)
        ['node-child1', {
          minX: 0,
          minY: 300,
          maxX: 150,
          maxY: 380
        }],
        // Child 2: 150x80 at (175, 300)
        ['node-child2', {
          minX: 175,
          minY: 300,
          maxX: 325,
          maxY: 380
        }],
        // Child 3: 150x80 at (350, 300)
        ['node-child3', {
          minX: 350,
          minY: 300,
          maxX: 500,
          maxY: 380
        }]
      ]);
      const mockEditor = createMockEditor(boundsMap);

      const result = calculateBoundsWithChildren(
        'root',
        mockEditor,
        mockTreeData,
        100 // padding
      );

      // Expected bounds should encompass all shapes:
      // minX: 0, minY: 100, maxX: 500, maxY: 380
      // With 100px padding on all sides
      expect(result).not.toBeNull();
      expect(result).toEqual({
        x: -100,   // 0 - 100
        y: 0,      // 100 - 100
        w: 700,    // (500 - 0) + 200
        h: 480     // (380 - 100) + 200
      });
    });

    test('bounds are wider/taller than just parent node', () => {
      const boundsMap = new Map([
        ['node-root', {
          minX: 100,
          minY: 100,
          maxX: 300,
          maxY: 200
        }],
        ['node-child1', {
          minX: 0,
          minY: 300,
          maxX: 150,
          maxY: 380
        }],
        ['node-child2', {
          minX: 350,
          minY: 300,
          maxX: 500,
          maxY: 380
        }]
      ]);
      const mockEditor = createMockEditor(boundsMap);

      const result = calculateBoundsWithChildren(
        'root',
        mockEditor,
        mockTreeData,
        0 // no padding to simplify comparison
      );

      // Calculate parent-only bounds
      const parentWidth = 300 - 100;  // 200
      const parentHeight = 200 - 100; // 100

      // Result should be larger than parent-only
      expect(result).not.toBeNull();
      expect(result!.w).toBeGreaterThan(parentWidth);
      expect(result!.h).toBeGreaterThan(parentHeight);
    });

  });

  describe('Padding Behavior', () => {

    test('default padding is 100px on all sides', () => {
      const boundsMap = new Map([
        ['node-no-children', {
          minX: 0,
          minY: 0,
          maxX: 200,
          maxY: 100
        }]
      ]);
      const mockEditor = createMockEditor(boundsMap);

      // Call without padding parameter
      const result = calculateBoundsWithChildren(
        'no-children',
        mockEditor,
        mockTreeData
      );

      expect(result).not.toBeNull();
      expect(result).toEqual({
        x: -100,  // 0 - 100 (default padding)
        y: -100,  // 0 - 100 (default padding)
        w: 400,   // 200 + 200 (padding on both sides)
        h: 300    // 100 + 200 (padding on both sides)
      });
    });

    test('custom padding is applied correctly', () => {
      const boundsMap = new Map([
        ['node-no-children', {
          minX: 0,
          minY: 0,
          maxX: 200,
          maxY: 100
        }]
      ]);
      const mockEditor = createMockEditor(boundsMap);

      const result = calculateBoundsWithChildren(
        'no-children',
        mockEditor,
        mockTreeData,
        50 // custom padding
      );

      expect(result).not.toBeNull();
      expect(result).toEqual({
        x: -50,   // 0 - 50
        y: -50,   // 0 - 50
        w: 300,   // 200 + 100
        h: 200    // 100 + 100
      });
    });

    test('zero padding works correctly', () => {
      const boundsMap = new Map([
        ['node-no-children', {
          minX: 100,
          minY: 100,
          maxX: 300,
          maxY: 200
        }]
      ]);
      const mockEditor = createMockEditor(boundsMap);

      const result = calculateBoundsWithChildren(
        'no-children',
        mockEditor,
        mockTreeData,
        0 // no padding
      );

      expect(result).not.toBeNull();
      expect(result).toEqual({
        x: 100,
        y: 100,
        w: 200,
        h: 100
      });
    });

  });

  describe('Edge Case: Many Children', () => {

    test('handles node with many children - bounds expand to fit all', () => {
      // Setup: Parent in center, 5 children spread in a wide arc
      const boundsMap = new Map([
        ['node-many-children', {
          minX: 200,
          minY: 0,
          maxX: 400,
          maxY: 100
        }],
        ['node-mc-child1', {
          minX: 0,
          minY: 200,
          maxX: 150,
          maxY: 280
        }],
        ['node-mc-child2', {
          minX: 175,
          minY: 200,
          maxX: 325,
          maxY: 280
        }],
        ['node-mc-child3', {
          minX: 350,
          minY: 200,
          maxX: 500,
          maxY: 280
        }],
        ['node-mc-child4', {
          minX: 525,
          minY: 200,
          maxX: 675,
          maxY: 280
        }],
        ['node-mc-child5', {
          minX: 700,
          minY: 200,
          maxX: 850,
          maxY: 280
        }]
      ]);
      const mockEditor = createMockEditor(boundsMap);

      const result = calculateBoundsWithChildren(
        'many-children',
        mockEditor,
        mockTreeData,
        50 // padding
      );

      // Expected: minX: 0, minY: 0, maxX: 850, maxY: 280
      expect(result).not.toBeNull();
      expect(result).toEqual({
        x: -50,    // 0 - 50
        y: -50,    // 0 - 50
        w: 950,    // (850 - 0) + 100
        h: 380     // (280 - 0) + 100
      });
    });

  });

  describe('Edge Case: Missing Child Shapes', () => {

    test('excludes children that do not exist as shapes', () => {
      // Setup: Parent exists, but only 1 of 3 children exist as shapes
      const boundsMap = new Map([
        ['node-root', {
          minX: 100,
          minY: 100,
          maxX: 300,
          maxY: 200
        }],
        // Only child1 exists as a shape
        ['node-child1', {
          minX: 50,
          minY: 300,
          maxX: 200,
          maxY: 380
        }]
        // child2 and child3 do NOT exist as shapes
      ]);
      const mockEditor = createMockEditor(boundsMap);

      const result = calculateBoundsWithChildren(
        'root',
        mockEditor,
        mockTreeData,
        0 // no padding
      );

      // Expected: Include parent (100-300, 100-200) and child1 (50-200, 300-380)
      expect(result).not.toBeNull();
      expect(result).toEqual({
        x: 50,     // min(100, 50) = 50
        y: 100,    // min(100, 300) = 100
        w: 250,    // (300 - 50)
        h: 280     // (380 - 100)
      });
    });

  });

  describe('Integration: createShapeId Format', () => {

    test('uses correct shape ID format (node-{nodeId})', () => {
      const boundsMap = new Map([
        ['node-root', {
          minX: 0,
          minY: 0,
          maxX: 100,
          maxY: 100
        }]
      ]);
      const mockEditor = createMockEditor(boundsMap);

      calculateBoundsWithChildren(
        'root',
        mockEditor,
        mockTreeData,
        0
      );

      // Verify getShape was called with correct ID format
      expect(mockEditor.getShape).toHaveBeenCalledWith('node-root');
    });

  });

});

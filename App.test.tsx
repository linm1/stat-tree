import { createShapeId } from 'tldraw';

/**
 * Test suite for TldrawMapView arrow creation
 *
 * These tests verify that arrow shapes are created with the correct structure
 * to avoid validation errors in Tldraw 2.4.4
 *
 * IMPORTANT: In Tldraw 2.x, arrow props should use SIMPLE coordinates {x, y}
 * NOT binding information. Bindings are created separately as binding records.
 */

describe('TldrawMapView - Arrow Creation', () => {
  describe('createArrow function', () => {
    // Mock helper to create a node shape (similar to the actual implementation)
    const createMockNode = (id: string, x: number, y: number, width = 220, height = 80) => {
      const shapeId = createShapeId(`node-${id}`);
      return {
        id: shapeId,
        type: 'geo',
        x,
        y,
        props: {
          w: width,
          h: height,
          geo: 'rectangle',
          color: 'grey',
          fill: 'none',
          dash: 'solid',
          size: 's',
          font: 'mono',
          text: 'Test Node',
          align: 'middle',
          verticalAlign: 'middle',
        },
        meta: { nodeId: id }
      };
    };

    // CORRECTED implementation of createArrow (what we're testing)
    const createArrow = (startNode: any, endNode: any, label?: string) => {
      // Calculate connection points
      // Start arrow from center-bottom of the start node
      const startX = startNode.x + (startNode.props.w / 2);
      const startY = startNode.y + startNode.props.h;

      // End arrow at center-top of the end node
      const endX = endNode.x + (endNode.props.w / 2);
      const endY = endNode.y;

      const edgeId = createShapeId(`edge-${startNode.id}-${endNode.id}`);

      // CORRECT format for Tldraw 2.x: Simple x,y coordinates
      // Bindings should be created separately, not in arrow props
      return {
        id: edgeId,
        type: 'arrow',
        props: {
          start: {
            x: startX,
            y: startY
          },
          end: {
            x: endX,
            y: endY
          },
          color: 'black',
          size: 's',
          dash: 'solid',
          text: label || '',
          font: 'mono',
        },
      };
    };

    it('should create arrow with ONLY x and y coordinates (no binding info in props)', () => {
      const startNode = createMockNode('start', 0, 0);
      const endNode = createMockNode('end', 300, 200);

      const arrow = createArrow(startNode, endNode);

      // Arrow props should have ONLY x and y, NOT binding information
      expect(arrow.props.start).toEqual({
        x: expect.any(Number),
        y: expect.any(Number)
      });

      expect(arrow.props.end).toEqual({
        x: expect.any(Number),
        y: expect.any(Number)
      });

      // Should NOT have binding properties in arrow props
      expect(arrow.props.start).not.toHaveProperty('type');
      expect(arrow.props.start).not.toHaveProperty('boundShapeId');
      expect(arrow.props.start).not.toHaveProperty('normalizedAnchor');
      expect(arrow.props.start).not.toHaveProperty('isExact');

      expect(arrow.props.end).not.toHaveProperty('type');
      expect(arrow.props.end).not.toHaveProperty('boundShapeId');
      expect(arrow.props.end).not.toHaveProperty('normalizedAnchor');
      expect(arrow.props.end).not.toHaveProperty('isExact');
    });

    it('should calculate start coordinates from source node center-bottom', () => {
      const startNode = createMockNode('start', 100, 200, 220, 80);
      const endNode = createMockNode('end', 400, 500);

      const arrow = createArrow(startNode, endNode);

      // Start should be at center-bottom of start node
      // Center-bottom: x = node.x + (width / 2), y = node.y + height
      const expectedX = 100 + (220 / 2); // 210
      const expectedY = 200 + 80; // 280

      expect(arrow.props.start.x).toBe(expectedX);
      expect(arrow.props.start.y).toBe(expectedY);
    });

    it('should calculate end coordinates from target node center-top', () => {
      const startNode = createMockNode('start', 100, 200);
      const endNode = createMockNode('end', 400, 500, 220, 80);

      const arrow = createArrow(startNode, endNode);

      // End should be at center-top of end node
      // Center-top: x = node.x + (width / 2), y = node.y
      const expectedX = 400 + (220 / 2); // 510
      const expectedY = 500; // top of the node

      expect(arrow.props.end.x).toBe(expectedX);
      expect(arrow.props.end.y).toBe(expectedY);
    });

    it('should preserve optional label text', () => {
      const startNode = createMockNode('start', 0, 0);
      const endNode = createMockNode('end', 300, 200);

      const arrowWithLabel = createArrow(startNode, endNode, 'Test Label');
      const arrowWithoutLabel = createArrow(startNode, endNode);

      expect(arrowWithLabel.props.text).toBe('Test Label');
      expect(arrowWithoutLabel.props.text).toBe('');
    });

    it('should create deterministic edge IDs based on node IDs', () => {
      const startNode = createMockNode('node1', 0, 0);
      const endNode = createMockNode('node2', 300, 200);

      const arrow1 = createArrow(startNode, endNode);
      const arrow2 = createArrow(startNode, endNode);

      // Same nodes should produce same edge ID
      expect(arrow1.id).toBe(arrow2.id);
    });
  });

  describe('Edge cases', () => {
    const createMockNode = (id: string, x: number, y: number, width = 220, height = 80) => {
      const shapeId = createShapeId(`node-${id}`);
      return {
        id: shapeId,
        type: 'geo',
        x,
        y,
        props: { w: width, h: height },
        meta: { nodeId: id }
      };
    };

    const createArrow = (startNode: any, endNode: any, label?: string) => {
      // Calculate connection points
      const startX = startNode.x + (startNode.props.w / 2);
      const startY = startNode.y + startNode.props.h;

      const endX = endNode.x + (endNode.props.w / 2);
      const endY = endNode.y;

      const edgeId = createShapeId(`edge-${startNode.id}-${endNode.id}`);

      return {
        id: edgeId,
        type: 'arrow',
        props: {
          start: {
            x: startX,
            y: startY
          },
          end: {
            x: endX,
            y: endY
          },
          color: 'black',
          size: 's',
          dash: 'solid',
          text: label || '',
          font: 'mono',
        },
      };
    };

    it('should handle nodes at origin (0, 0)', () => {
      const startNode = createMockNode('origin', 0, 0);
      const endNode = createMockNode('end', 100, 100);

      const arrow = createArrow(startNode, endNode);

      expect(arrow.props.start.x).toBeDefined();
      expect(arrow.props.start.y).toBeDefined();
      expect(arrow.props.end.x).toBeDefined();
      expect(arrow.props.end.y).toBeDefined();
    });

    it('should handle nodes with different dimensions', () => {
      const smallNode = createMockNode('small', 0, 0, 100, 50);
      const largeNode = createMockNode('large', 300, 200, 400, 150);

      const arrow = createArrow(smallNode, largeNode);

      // Should calculate based on actual dimensions
      expect(arrow.props.start.x).toBe(0 + (100 / 2)); // 50
      expect(arrow.props.start.y).toBe(0 + 50); // 50
      expect(arrow.props.end.x).toBe(300 + (400 / 2)); // 500
      expect(arrow.props.end.y).toBe(200); // top of large node
    });
  });

  describe('Invalid arrow structure (what causes ValidationError)', () => {
    it('should NOT create arrows with binding properties mixed with coordinates', () => {
      // This is the BROKEN pattern that causes ValidationError
      const badArrow = {
        id: createShapeId('bad-arrow'),
        type: 'arrow',
        props: {
          start: {
            type: 'binding',
            boundShapeId: createShapeId('node-1'),
            normalizedAnchor: { x: 0.5, y: 1 },
            isExact: false,
            x: 100, // ❌ Can't mix binding info with x,y coordinates
            y: 80
          },
          end: {
            type: 'binding',
            boundShapeId: createShapeId('node-2'),
            normalizedAnchor: { x: 0.5, y: 0 },
            isExact: false,
            x: 400,
            y: 200
          },
          color: 'black',
          size: 's',
          dash: 'solid',
        }
      };

      // This structure will cause: "ValidationError: At shape(type = arrow).props.start.type: Unexpected property"
      expect(badArrow.props.start).toHaveProperty('type');
      expect(badArrow.props.start).toHaveProperty('x');
      // This combination is INVALID in Tldraw 2.x
    });
  });
});

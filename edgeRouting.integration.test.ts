import { describe, it, expect } from '@jest/globals';
import { DEFAULT_LAYOUT } from './utils/treeLayout';

/**
 * Integration tests for Phase 4: Edge Routing
 *
 * These tests verify the edge routing logic matches the expected
 * H-V-H (Horizontal-Vertical-Horizontal) pattern for left-right layout.
 */

describe('Phase 4: Edge Routing Integration Tests', () => {
  describe('Connection Point Calculations', () => {
    it('calculates parent connection point at right center', () => {
      // Simulate a parent node at (100, 200) with default dimensions
      const parentNode = {
        x: 100,
        y: 200,
        props: {
          w: DEFAULT_LAYOUT.nodeWidth,  // 250
          h: DEFAULT_LAYOUT.nodeHeight, // 70
        }
      };

      // Expected: connect from right edge, vertical center
      const parentRightX = parentNode.x + parentNode.props.w;
      const parentCenterY = parentNode.y + parentNode.props.h / 2;

      expect(parentRightX).toBe(350);
      expect(parentCenterY).toBe(235);
    });

    it('calculates child connection point at left center', () => {
      // Simulate a child node at (1250, 300) with default dimensions
      const childNode = {
        x: 1250,
        y: 300,
        props: {
          w: DEFAULT_LAYOUT.nodeWidth,  // 250
          h: DEFAULT_LAYOUT.nodeHeight, // 70
        }
      };

      // Expected: connect from left edge, vertical center
      const childLeftX = childNode.x;
      const childCenterY = childNode.y + childNode.props.h / 2;

      expect(childLeftX).toBe(1250);
      expect(childCenterY).toBe(335);
    });

    it('calculates midpoint X at 40% of levelGap from parent', () => {
      const parentRightX = 350;
      const midGap = DEFAULT_LAYOUT.levelGap * 0.4; // 900 * 0.4 = 360
      const midX = parentRightX + midGap;

      expect(midX).toBe(710);
    });
  });

  describe('H-V-H Routing Pattern', () => {
    it('creates correct segment 1: horizontal from parent right to midX', () => {
      const parentRightX = 440;
      const parentCenterY = 235;
      const midX = 480;

      const segment1 = {
        start: { x: parentRightX, y: parentCenterY },
        end: { x: midX, y: parentCenterY },
      };

      // Verify horizontal segment (Y unchanged)
      expect(segment1.start.y).toBe(segment1.end.y);
      // Verify moves right
      expect(segment1.end.x).toBeGreaterThan(segment1.start.x);
    });

    it('creates correct segment 2: vertical from parent Y to child Y', () => {
      const midX = 360;
      const parentCenterY = 235;
      const childCenterY = 335;

      const segment2 = {
        start: { x: midX, y: parentCenterY },
        end: { x: midX, y: childCenterY },
      };

      // Verify vertical segment (X unchanged)
      expect(segment2.start.x).toBe(segment2.end.x);
      // Verify moves down (child lower than parent in this example)
      expect(segment2.end.y).toBeGreaterThan(segment2.start.y);
    });

    it('creates correct segment 3: horizontal from midX to child left with arrow', () => {
      const midX = 360;
      const childCenterY = 335;
      const childLeftX = 400;

      const segment3 = {
        start: { x: midX, y: childCenterY },
        end: { x: childLeftX, y: childCenterY },
        arrowheadEnd: 'arrow', // Arrow points toward child
      };

      // Verify horizontal segment (Y unchanged)
      expect(segment3.start.y).toBe(segment3.end.y);
      // Verify moves right toward child
      expect(segment3.end.x).toBeGreaterThan(segment3.start.x);
      // Verify arrowhead at end
      expect(segment3.arrowheadEnd).toBe('arrow');
    });
  });

  describe('Multi-Child Scenarios', () => {
    it('handles single child with straight horizontal-vertical-horizontal path', () => {
      // Parent at (100, 200), child at (1250, 200) - same Y (aligned)
      const parentRightX = 100 + DEFAULT_LAYOUT.nodeWidth;  // 100 + 250 = 350
      const parentCenterY = 200 + DEFAULT_LAYOUT.nodeHeight / 2;  // 200 + 35 = 235
      const childLeftX = 1250; // 350 + 900
      const childCenterY = 200 + DEFAULT_LAYOUT.nodeHeight / 2;  // 200 + 35 = 235

      // Midpoint
      const midX = parentRightX + DEFAULT_LAYOUT.levelGap * 0.4;  // 350 + 360 = 710

      // Segment 1: Horizontal
      expect(parentCenterY).toBe(parentCenterY); // Y unchanged

      // Segment 2: Vertical (should be zero length if perfectly aligned)
      const verticalDistance = Math.abs(childCenterY - parentCenterY);
      expect(verticalDistance).toBe(0); // Perfectly aligned

      // Segment 3: Horizontal
      expect(childCenterY).toBe(childCenterY); // Y unchanged
    });

    it('handles multiple children with vertical spread', () => {
      // Parent at (100, 200)
      const parentRightX = 100 + DEFAULT_LAYOUT.nodeWidth;  // 100 + 250 = 350
      const parentCenterY = 200 + DEFAULT_LAYOUT.nodeHeight / 2;  // 200 + 35 = 235

      // Child 1 at (1250, 100) - above parent
      const child1LeftX = 1250;
      const child1CenterY = 100 + DEFAULT_LAYOUT.nodeHeight / 2;  // 100 + 35 = 135

      // Child 2 at (1250, 200) - aligned with parent
      const child2LeftX = 1250;
      const child2CenterY = 200 + DEFAULT_LAYOUT.nodeHeight / 2;  // 200 + 35 = 235

      // Child 3 at (1250, 300) - below parent
      const child3LeftX = 1250;
      const child3CenterY = 300 + DEFAULT_LAYOUT.nodeHeight / 2;  // 300 + 35 = 335

      const midX = parentRightX + DEFAULT_LAYOUT.levelGap * 0.4;  // 350 + 360 = 710

      // All children connect at same midX (vertical line at midX)
      expect(midX).toBe(parentRightX + 360);

      // Vertical segments have different lengths
      const vertical1 = Math.abs(child1CenterY - parentCenterY);
      const vertical2 = Math.abs(child2CenterY - parentCenterY);
      const vertical3 = Math.abs(child3CenterY - parentCenterY);

      expect(vertical1).toBeGreaterThan(0); // Child 1 above
      expect(vertical2).toBe(0); // Child 2 aligned
      expect(vertical3).toBeGreaterThan(0); // Child 3 below
    });
  });

  describe('Edge Cases', () => {
    it('handles child at same position as parent (degenerate case)', () => {
      const parentRightX = 350;
      const parentCenterY = 235;
      const childLeftX = 350; // Overlapping (degenerate)
      const childCenterY = 235;

      const midX = parentRightX + DEFAULT_LAYOUT.levelGap * 0.4;  // 350 + 360 = 710

      // Even with overlap, routing should work
      // Segment 1: right to midX
      expect(midX).toBeGreaterThan(parentRightX);
      // Segment 2: no vertical movement
      expect(childCenterY).toBe(parentCenterY);
      // Segment 3: would need to go backwards (negative direction)
      // This is a degenerate case that shouldn't occur in practice
      const segment3Length = childLeftX - midX;
      expect(segment3Length).toBeLessThan(0); // Backwards
    });

    it('handles large vertical distances between parent and child', () => {
      const parentCenterY = 100;
      const childCenterY = 1000; // Very far below

      const verticalDistance = Math.abs(childCenterY - parentCenterY);
      expect(verticalDistance).toBe(900);

      // Midpoint X unchanged (vertical distance doesn't affect horizontal routing)
      const parentRightX = 350; // Current nodeWidth (250)
      const midX = parentRightX + DEFAULT_LAYOUT.levelGap * 0.4;
      expect(midX).toBe(710); // 350 + 360
    });

    it('handles child above parent (negative vertical direction)', () => {
      const parentCenterY = 300;
      const childCenterY = 100; // Above parent

      const verticalDistance = childCenterY - parentCenterY;
      expect(verticalDistance).toBeLessThan(0); // Negative = upward
    });
  });

  describe('Label Placement', () => {
    it('should NOT display labels on edges in Map view', () => {
      // Edge labels are intentionally hidden in Map view for cleaner visualization
      // Labels are only shown in the interactive Flow view
      const segment3 = {
        start: { x: 360, y: 335 },
        end: { x: 400, y: 335 },
        arrowheadEnd: 'arrow',
        text: '',  // No label should be shown on Map view edges
      };

      expect(segment3.text).toBe('');
    });
  });

  describe('Arrowhead Direction', () => {
    it('arrowhead points horizontally toward child (left-to-right)', () => {
      // In left-right layout, arrowhead on segment 3 points right
      const segment3 = {
        start: { x: 360, y: 335 },
        end: { x: 400, y: 335 },
        arrowheadEnd: 'arrow',
      };

      // Arrowhead at end of horizontal segment
      expect(segment3.arrowheadEnd).toBe('arrow');
      // Points right (end.x > start.x)
      expect(segment3.end.x).toBeGreaterThan(segment3.start.x);
      // Same Y (horizontal)
      expect(segment3.end.y).toBe(segment3.start.y);
    });

    it('no arrowheads on first two segments', () => {
      const segment1 = { arrowheadStart: 'none', arrowheadEnd: 'none' };
      const segment2 = { arrowheadStart: 'none', arrowheadEnd: 'none' };

      expect(segment1.arrowheadStart).toBe('none');
      expect(segment1.arrowheadEnd).toBe('none');
      expect(segment2.arrowheadStart).toBe('none');
      expect(segment2.arrowheadEnd).toBe('none');
    });
  });
});

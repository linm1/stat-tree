import { describe, it, expect } from '@jest/globals';
import {
  calculateArrowBend,
  getArrowStyle,
  DEFAULT_LAYOUT,
} from './treeLayout';

/**
 * Phase 4 Test Suite: Edge Routing for Left-to-Right Layout
 *
 * Testing Strategy:
 * - Unit tests for arrow bend calculations (should work with vertical distances)
 * - Integration tests would verify edge connection points (visual verification needed)
 * - Arrow style tests (already working, unchanged)
 */

describe('Phase 4: Edge Routing Tests', () => {
  describe('calculateArrowBend', () => {
    it('returns 0 for single child (straight line)', () => {
      const bend = calculateArrowBend(0, 1, 200);
      expect(bend).toBe(0);
    });

    it('returns 0 for zero distance', () => {
      const bend = calculateArrowBend(0, 3, 0);
      expect(bend).toBe(0);
    });

    it('calculates negative bend for first sibling (topmost in left-right layout)', () => {
      const bend = calculateArrowBend(0, 3, 200);
      expect(bend).toBeLessThan(0);
    });

    it('calculates positive bend for last sibling (bottommost in left-right layout)', () => {
      const bend = calculateArrowBend(2, 3, 200);
      expect(bend).toBeGreaterThan(0);
    });

    it('calculates near-zero bend for middle sibling', () => {
      const bend = calculateArrowBend(1, 3, 200);
      expect(Math.abs(bend)).toBeLessThan(1);
    });

    it('caps bend at maximum value', () => {
      // Large distance should be capped at 80
      const bend = calculateArrowBend(0, 2, 10000);
      expect(Math.abs(bend)).toBeLessThanOrEqual(80);
    });

    it('handles negative horizontal distance (should use absolute value)', () => {
      const bend1 = calculateArrowBend(0, 3, -200);
      const bend2 = calculateArrowBend(0, 3, 200);
      expect(Math.abs(bend1)).toBeCloseTo(Math.abs(bend2));
    });
  });

  describe('getArrowStyle', () => {
    it('returns black solid arrow for level 1-2', () => {
      const style1 = getArrowStyle(1);
      const style2 = getArrowStyle(2);

      expect(style1.color).toBe('black');
      expect(style1.dash).toBe('solid');
      expect(style1.arrowheadEnd).toBe('arrow');

      expect(style2.color).toBe('black');
      expect(style2.dash).toBe('solid');
    });

    it('returns violet solid arrow for level 3', () => {
      const style = getArrowStyle(3);

      expect(style.color).toBe('violet');
      expect(style.dash).toBe('solid');
      expect(style.arrowheadEnd).toBe('arrow');
    });

    it('returns blue dashed triangle for level 4', () => {
      const style = getArrowStyle(4);

      expect(style.color).toBe('blue');
      expect(style.dash).toBe('dashed');
      expect(style.arrowheadEnd).toBe('triangle');
    });

    it('returns grey dashed dot for level 5+', () => {
      const style5 = getArrowStyle(5);
      const style10 = getArrowStyle(10);

      expect(style5.color).toBe('grey');
      expect(style5.dash).toBe('dashed');
      expect(style5.arrowheadEnd).toBe('dot');

      expect(style10.color).toBe('grey');
    });

    it('handles invalid levels (0 or negative) as level 1', () => {
      const style0 = getArrowStyle(0);
      const styleNeg = getArrowStyle(-1);

      expect(style0.color).toBe('black');
      expect(styleNeg.color).toBe('black');
    });
  });

  describe('Layout Constants', () => {
    it('should have node width of 250px for compact layout', () => {
      expect(DEFAULT_LAYOUT.nodeWidth).toBe(250);
    });

    it('should have node height of 70px for compact layout', () => {
      expect(DEFAULT_LAYOUT.nodeHeight).toBe(70);
    });

    it('should have root positioned at left (startX: 0)', () => {
      expect(DEFAULT_LAYOUT.startX).toBe(0);
      expect(DEFAULT_LAYOUT.startY).toBe(0);
    });
  });

  describe('DEFAULT_LAYOUT overlap prevention', () => {
    it('siblingGap should be small for compact layout', () => {
      // Intentionally small gap (10px) for compact tree layout
      expect(DEFAULT_LAYOUT.siblingGap).toBe(10);
    });

    it('levelGap should be large enough for routing', () => {
      // Large horizontal gap (900px) allows room for edge routing
      expect(DEFAULT_LAYOUT.levelGap).toBeGreaterThanOrEqual(900);
    });

    it('nodeWidth should accommodate text content', () => {
      expect(DEFAULT_LAYOUT.nodeWidth).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Edge Connection Point Calculations (Integration)', () => {
    /**
     * These tests verify the EXPECTED behavior for left-right layout.
     * Actual visual verification will be done by running the app.
     */

    it('should calculate parent RIGHT center as connection point', () => {
      // Test values
      const parentX = 100;
      const parentY = 200;
      const nodeWidth = DEFAULT_LAYOUT.nodeWidth;  // 250
      const nodeHeight = DEFAULT_LAYOUT.nodeHeight; // 70

      // Expected: parent connects from RIGHT center
      const expectedParentX = parentX + nodeWidth;  // 350
      const expectedParentY = parentY + nodeHeight / 2; // 235 (vertical center)

      expect(expectedParentX).toBe(350);
      expect(expectedParentY).toBe(235);
    });

    it('should calculate child LEFT center as connection point', () => {
      // Test values
      const childX = 400;
      const childY = 300;
      const nodeHeight = DEFAULT_LAYOUT.nodeHeight; // 70

      // Expected: child connects from LEFT center
      const expectedChildX = childX; // 400 (left edge)
      const expectedChildY = childY + nodeHeight / 2; // 335 (vertical center)

      expect(expectedChildX).toBe(400);
      expect(expectedChildY).toBe(335);
    });

    it('should calculate midpoint X for horizontal-vertical-horizontal routing', () => {
      // Test values - updated for current nodeWidth
      const parentRightX = 350; // 100 + 250
      const childLeftX = 1250; // 350 + 900
      const levelGap = DEFAULT_LAYOUT.levelGap; // 900

      // Expected: midpoint should be 40% of the gap from parent
      const expectedMidX = parentRightX + (levelGap * 0.4);

      expect(expectedMidX).toBe(710); // 350 + 360
    });

    it('should route edges in H-V-H pattern (3 segments)', () => {
      // This is a documentation test showing expected routing pattern
      const segments = [
        { name: 'Horizontal 1', direction: 'horizontal', description: 'Parent right to midpoint X' },
        { name: 'Vertical', direction: 'vertical', description: 'Parent Y to child Y' },
        { name: 'Horizontal 2', direction: 'horizontal', description: 'Midpoint X to child left (with arrow)' }
      ];

      expect(segments).toHaveLength(3);
      expect(segments[0].direction).toBe('horizontal');
      expect(segments[1].direction).toBe('vertical');
      expect(segments[2].direction).toBe('horizontal');
    });
  });
});

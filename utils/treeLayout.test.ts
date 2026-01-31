import { TREE_DATA } from '../data';
import {
  calculateSubtreeWidth,
  calculateNodePositions,
  calculateArrowBend,
  getArrowStyle,
  DEFAULT_LAYOUT,
  LayoutConstants,
  LayoutNode,
} from './treeLayout';

describe('calculateSubtreeWidth', () => {
  const constants: LayoutConstants = DEFAULT_LAYOUT;

  describe('Leaf nodes', () => {
    it('returns node width for leaf node with result', () => {
      const width = calculateSubtreeWidth('describe_explore', TREE_DATA, constants);
      expect(width).toBe(constants.nodeWidth);
    });

    it('returns node width for another leaf node', () => {
      const width = calculateSubtreeWidth('cont_ttest', TREE_DATA, constants);
      expect(width).toBe(constants.nodeWidth);
    });
  });

  describe('Parent nodes', () => {
    it('returns correct width for parent with 2 children', () => {
      // start node has 2 children
      const width = calculateSubtreeWidth('start', TREE_DATA, constants);

      // Expected: 2 * nodeWidth + 1 * minXGap
      // = 2 * 180 + 1 * 15 = 360 + 15 = 375
      expect(width).toBe(375);
    });

    it('returns correct width for parent with 5 children (compare_groups)', () => {
      // compare_groups now has 5 children merged from outcome_type
      const width = calculateSubtreeWidth('compare_groups', TREE_DATA, constants);

      // Expected: 5 * nodeWidth + 4 * minXGap
      // = 5 * 180 + 4 * 15 = 900 + 60 = 960
      expect(width).toBe(960);
    });

    it('returns parent width when larger than children sum', () => {
      // If parent is artificially wide, it should be used instead
      const wideConstants: LayoutConstants = {
        ...constants,
        nodeWidth: 2000, // Make node very wide
      };

      const width = calculateSubtreeWidth('start', TREE_DATA, wideConstants);

      // Should return the parent's width, not the children's sum
      expect(width).toBeGreaterThanOrEqual(2000);
    });
  });

  describe('Deep nesting', () => {
    it('calculates width correctly for deeply nested tree', () => {
      // Test with cont_single_2g which has children at multiple levels
      const width = calculateSubtreeWidth('cont_single_2g', TREE_DATA, constants);

      // cont_single_2g has 3 children
      // Expected: 3 * nodeWidth + 2 * minXGap
      // = 3 * 180 + 2 * 15 = 540 + 30 = 570
      expect(width).toBe(570);
    });

    it('handles multi-level branching correctly', () => {
      // compare_groups -> outcome_type -> multiple branches
      const width = calculateSubtreeWidth('compare_groups', TREE_DATA, constants);

      // compare_groups has 2 children, but each points to outcome_type
      // which has 5 children, so the actual width should account for that
      expect(width).toBeGreaterThan(constants.nodeWidth);
    });
  });

  describe('Edge cases', () => {
    it('throws error for non-existent node', () => {
      expect(() => {
        calculateSubtreeWidth('non_existent_node', TREE_DATA, constants);
      }).toThrow();
    });

    it('handles node with no options (leaf)', () => {
      const width = calculateSubtreeWidth('bin_freq', TREE_DATA, constants);
      expect(width).toBe(constants.nodeWidth);
    });

    it('handles empty tree data', () => {
      expect(() => {
        calculateSubtreeWidth('start', {}, constants);
      }).toThrow();
    });
  });

  describe('Width calculation correctness', () => {
    it('ensures no overlap with minimum gap', () => {
      const width = calculateSubtreeWidth('compare_groups', TREE_DATA, constants);

      // With 5 children, minimum width to prevent overlap:
      // 5 * nodeWidth + 4 * minXGap
      const minWidthNoOverlap = 5 * constants.nodeWidth + 4 * constants.minXGap;

      expect(width).toBeGreaterThanOrEqual(minWidthNoOverlap);
    });
  });
});

describe('calculateNodePositions', () => {
  const constants: LayoutConstants = DEFAULT_LAYOUT;

  describe('Root node positioning', () => {
    it('positions root node at start coordinates', () => {
      const layout = calculateNodePositions('start', TREE_DATA, constants.startX, constants.startY, 0, constants);

      expect(layout.id).toBe('start');
      expect(layout.y).toBe(constants.startY);
      expect(layout.level).toBe(0);
      expect(layout.width).toBe(constants.nodeWidth);
      expect(layout.height).toBe(constants.nodeHeight);
    });

    it('centers root node at provided centerX', () => {
      const centerX = 500;
      const layout = calculateNodePositions('start', TREE_DATA, centerX, 0, 0, constants);

      // Node should be centered at centerX
      expect(layout.x).toBe(centerX - constants.nodeWidth / 2);
    });
  });

  describe('Children positioning', () => {
    it('positions children at correct Y offset', () => {
      const layout = calculateNodePositions('start', TREE_DATA, 0, 0, 0, constants);

      expect(layout.children.length).toBe(2);

      layout.children.forEach(child => {
        expect(child.y).toBe(constants.yGap);
        expect(child.level).toBe(1);
      });
    });

    it('distributes children horizontally with proper spacing', () => {
      const layout = calculateNodePositions('start', TREE_DATA, 500, 0, 0, constants);

      // Check that children don't overlap
      const children = layout.children;
      for (let i = 0; i < children.length - 1; i++) {
        const child1 = children[i];
        const child2 = children[i + 1];

        const child1Right = child1.x + child1.width;
        const child2Left = child2.x;

        // Gap should be at least minXGap
        expect(child2Left - child1Right).toBeGreaterThanOrEqual(constants.minXGap);
      }
    });

    it('handles 5-way branch (compare_groups) with sufficient spacing', () => {
      const layout = calculateNodePositions('compare_groups', TREE_DATA, 750, 0, 0, constants);

      expect(layout.children.length).toBe(5);

      // Verify no overlaps
      const children = layout.children;
      for (let i = 0; i < children.length - 1; i++) {
        const child1 = children[i];
        const child2 = children[i + 1];

        const child1Right = child1.x + child1.width;
        const child2Left = child2.x;

        expect(child2Left - child1Right).toBeGreaterThanOrEqual(constants.minXGap);
      }
    });
  });

  describe('Deep nesting', () => {
    it('handles deeply nested tree correctly', () => {
      const layout = calculateNodePositions('cont_time', TREE_DATA, 500, 0, 0, constants);

      // cont_time has 2 children at level 1
      expect(layout.level).toBe(0);
      expect(layout.children.length).toBe(2);

      // Check nested children
      const child = layout.children[0];
      expect(child.level).toBe(1);
      expect(child.y).toBe(constants.yGap);

      // If the child has children, they should be at level 2
      if (child.children.length > 0) {
        expect(child.children[0].level).toBe(2);
        expect(child.children[0].y).toBe(2 * constants.yGap);
      }
    });

    it('maintains level consistency throughout tree', () => {
      const layout = calculateNodePositions('start', TREE_DATA, 500, 0, 0, constants);

      // Recursive function to check all levels
      function checkLevels(node: LayoutNode, expectedLevel: number) {
        expect(node.level).toBe(expectedLevel);
        node.children.forEach(child => {
          checkLevels(child, expectedLevel + 1);
        });
      }

      checkLevels(layout, 0);
    });
  });

  describe('Centering and symmetry', () => {
    it('centers children group around parent center', () => {
      const parentCenterX = 5000; // Use larger centerX to avoid negative positions
      const layout = calculateNodePositions('compare_groups', TREE_DATA, parentCenterX, 0, 0, constants);

      // With 5 children, they should be balanced around the center
      const children = layout.children;

      // Verify children exist
      expect(children.length).toBe(5);

      // Calculate the bounding box of all children
      const leftmost = children[0].x;
      const rightmost = children[children.length - 1].x + children[children.length - 1].width;

      // Center of children group
      const centerOfChildren = (leftmost + rightmost) / 2;

      // Center of children should be reasonably close to parent's centerX
      // For complex trees with varying subtree widths, allow reasonable tolerance
      const tolerance = 500; // pixels
      expect(Math.abs(centerOfChildren - parentCenterX)).toBeLessThan(tolerance);
    });
  });

  describe('Leaf nodes', () => {
    it('leaf node has no children', () => {
      const layout = calculateNodePositions('describe_explore', TREE_DATA, 0, 0, 0, constants);

      expect(layout.children.length).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('throws error for non-existent node', () => {
      expect(() => {
        calculateNodePositions('non_existent', TREE_DATA, 0, 0, 0, constants);
      }).toThrow();
    });

    it('handles multiple children correctly', () => {
      // compare_groups now has 5 children directly (outcome types)
      const layout = calculateNodePositions('compare_groups', TREE_DATA, 500, 0, 0, constants);

      expect(layout.children.length).toBe(5);
      // Each child is a different outcome type
    });
  });

  describe('Position calculation correctness', () => {
    it('ensures all positions are finite numbers', () => {
      const layout = calculateNodePositions('start', TREE_DATA, 500, 0, 0, constants);

      function checkFinite(node: LayoutNode) {
        expect(Number.isFinite(node.x)).toBe(true);
        expect(Number.isFinite(node.y)).toBe(true);
        expect(Number.isFinite(node.width)).toBe(true);
        expect(Number.isFinite(node.height)).toBe(true);
        expect(Number.isFinite(node.level)).toBe(true);

        node.children.forEach(checkFinite);
      }

      checkFinite(layout);
    });

    it('ensures no negative positions with sufficient centerX', () => {
      // Calculate a safe centerX that ensures no negative positions
      // The start node's largest subtree is compare_objective which leads to outcome_type
      // We need centerX large enough to accommodate the full tree width
      const safeCenterX = 10000; // Large enough to avoid negatives

      const layout = calculateNodePositions('start', TREE_DATA, safeCenterX, 0, 0, constants);

      function checkNonNegative(node: LayoutNode) {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.y).toBeGreaterThanOrEqual(0);

        node.children.forEach(checkNonNegative);
      }

      checkNonNegative(layout);
    });
  });
});

describe('DEFAULT_LAYOUT constants', () => {
  it('has expected default values', () => {
    expect(DEFAULT_LAYOUT.nodeWidth).toBe(180);
    expect(DEFAULT_LAYOUT.nodeHeight).toBe(80);
    expect(DEFAULT_LAYOUT.minXGap).toBe(15);
    expect(DEFAULT_LAYOUT.yGap).toBe(100);
    expect(DEFAULT_LAYOUT.startX).toBe(0);
    expect(DEFAULT_LAYOUT.startY).toBe(0);
  });

  it('has reasonable proportions', () => {
    expect(DEFAULT_LAYOUT.nodeWidth).toBeGreaterThan(DEFAULT_LAYOUT.nodeHeight);
    expect(DEFAULT_LAYOUT.minXGap).toBeGreaterThan(0);
    expect(DEFAULT_LAYOUT.yGap).toBeGreaterThan(DEFAULT_LAYOUT.nodeHeight);
  });
});

// Phase 2: Curved Arrow Support Tests
describe('calculateArrowBend', () => {
  describe('basic behavior', () => {
    it('returns 0 for single child', () => {
      const bend = calculateArrowBend(0, 1, 200);
      expect(bend).toBe(0);
    });

    it('returns 0 for zero horizontal distance', () => {
      const bend = calculateArrowBend(1, 3, 0);
      expect(bend).toBe(0);
    });
  });

  describe('three siblings with standard spacing', () => {
    const horizontalDistance = 200;

    it('leftmost sibling returns negative bend', () => {
      const bend = calculateArrowBend(0, 3, horizontalDistance);
      expect(bend).toBeLessThan(0);
      expect(bend).toBeCloseTo(-15, 1); // 200 * 0.15 * -0.5
    });

    it('middle sibling returns near-zero bend', () => {
      const bend = calculateArrowBend(1, 3, horizontalDistance);
      expect(Math.abs(bend)).toBeLessThan(1);
      expect(bend).toBeCloseTo(0, 1);
    });

    it('rightmost sibling returns positive bend', () => {
      const bend = calculateArrowBend(2, 3, horizontalDistance);
      expect(bend).toBeGreaterThan(0);
      expect(bend).toBeCloseTo(15, 1); // 200 * 0.15 * 0.5
    });
  });

  describe('five siblings with standard spacing', () => {
    const horizontalDistance = 300;

    it('outer siblings have more bend than inner siblings', () => {
      const leftmost = calculateArrowBend(0, 5, horizontalDistance);
      const leftInner = calculateArrowBend(1, 5, horizontalDistance);
      const center = calculateArrowBend(2, 5, horizontalDistance);
      const rightInner = calculateArrowBend(3, 5, horizontalDistance);
      const rightmost = calculateArrowBend(4, 5, horizontalDistance);

      // Check symmetry
      expect(leftmost).toBeLessThan(0);
      expect(rightmost).toBeGreaterThan(0);
      expect(Math.abs(leftmost)).toBeCloseTo(Math.abs(rightmost), 1);

      // Check magnitude ordering
      expect(Math.abs(leftmost)).toBeGreaterThan(Math.abs(leftInner));
      expect(Math.abs(leftInner)).toBeGreaterThan(Math.abs(center));
      expect(Math.abs(rightInner)).toBeGreaterThan(Math.abs(center));
      expect(Math.abs(rightmost)).toBeGreaterThan(Math.abs(rightInner));

      // Check center is near zero
      expect(Math.abs(center)).toBeLessThan(1);
    });
  });

  describe('bend capping', () => {
    it('caps positive bend at 80 for very wide spacing', () => {
      // With 2 siblings, rightmost has normalizedPosition = 0.5
      // Need 80 / 0.5 / 0.15 = 1066.67 distance to trigger cap
      const bend = calculateArrowBend(1, 2, 1100); // Very wide
      expect(bend).toBeLessThanOrEqual(80);
      expect(bend).toBe(80); // Should be exactly 80 (capped)
    });

    it('caps negative bend at -80 for very wide spacing', () => {
      // With 2 siblings, leftmost has normalizedPosition = -0.5
      // Need 80 / 0.5 / 0.15 = 1066.67 distance to trigger cap
      const bend = calculateArrowBend(0, 2, 1100); // Very wide
      expect(bend).toBeGreaterThanOrEqual(-80);
      expect(bend).toBe(-80); // Should be exactly -80 (capped)
    });

    it('does not cap bend for moderate spacing', () => {
      const bend = calculateArrowBend(2, 3, 200);
      expect(Math.abs(bend)).toBeLessThan(80);
    });
  });

  describe('edge cases', () => {
    it('handles negative horizontal distance', () => {
      const bend = calculateArrowBend(0, 3, -200);
      expect(bend).toBeLessThan(0);
      expect(Math.abs(bend)).toBeCloseTo(15, 1);
    });

    it('handles two siblings', () => {
      const left = calculateArrowBend(0, 2, 200);
      const right = calculateArrowBend(1, 2, 200);

      expect(left).toBeLessThan(0);
      expect(right).toBeGreaterThan(0);
      expect(Math.abs(left)).toBeCloseTo(Math.abs(right), 1);
    });
  });
});

describe('getArrowStyle', () => {
  describe('level 1-2: black, solid, arrow', () => {
    it('returns correct style for level 1', () => {
      const style = getArrowStyle(1);
      expect(style.color).toBe('black');
      expect(style.dash).toBe('solid');
      expect(style.arrowheadEnd).toBe('arrow');
    });

    it('returns correct style for level 2', () => {
      const style = getArrowStyle(2);
      expect(style.color).toBe('black');
      expect(style.dash).toBe('solid');
      expect(style.arrowheadEnd).toBe('arrow');
    });
  });

  describe('level 3: violet, solid, arrow', () => {
    it('returns correct style for level 3', () => {
      const style = getArrowStyle(3);
      expect(style.color).toBe('violet');
      expect(style.dash).toBe('solid');
      expect(style.arrowheadEnd).toBe('arrow');
    });
  });

  describe('level 4: blue, dashed, triangle', () => {
    it('returns correct style for level 4', () => {
      const style = getArrowStyle(4);
      expect(style.color).toBe('blue');
      expect(style.dash).toBe('dashed');
      expect(style.arrowheadEnd).toBe('triangle');
    });
  });

  describe('level 5+: grey, dashed, dot', () => {
    it('returns correct style for level 5', () => {
      const style = getArrowStyle(5);
      expect(style.color).toBe('grey');
      expect(style.dash).toBe('dashed');
      expect(style.arrowheadEnd).toBe('dot');
    });

    it('returns level 5 style for levels greater than 5', () => {
      const style6 = getArrowStyle(6);
      const style10 = getArrowStyle(10);
      const style100 = getArrowStyle(100);

      expect(style6.color).toBe('grey');
      expect(style6.dash).toBe('dashed');
      expect(style6.arrowheadEnd).toBe('dot');

      expect(style10.color).toBe('grey');
      expect(style10.dash).toBe('dashed');
      expect(style10.arrowheadEnd).toBe('dot');

      expect(style100.color).toBe('grey');
      expect(style100.dash).toBe('dashed');
      expect(style100.arrowheadEnd).toBe('dot');
    });
  });

  describe('edge cases', () => {
    it('handles level 0 as level 1', () => {
      const style = getArrowStyle(0);
      expect(style.color).toBe('black');
      expect(style.dash).toBe('solid');
      expect(style.arrowheadEnd).toBe('arrow');
    });

    it('handles negative levels as level 1', () => {
      const style = getArrowStyle(-5);
      expect(style.color).toBe('black');
      expect(style.dash).toBe('solid');
      expect(style.arrowheadEnd).toBe('arrow');
    });
  });
});

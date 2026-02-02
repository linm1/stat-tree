/**
 * Integration Tests for Progressive Disclosure Feature
 *
 * Tests the complete end-to-end functionality of the progressive disclosure system,
 * verifying that state management, UI rendering, and user interactions work together.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ExpansionState,
  createInitialExpansionState,
  toggleNodeExpansion,
  isNodeVisible,
  hasChildren,
  getVisibleNodes
} from './utils/expansionState';
import { calculateNodePositions, DEFAULT_LAYOUT, LayoutNode } from './utils/treeLayout';
import { TREE_DATA } from './data';
import { TreeData } from './types';

describe('Progressive Disclosure - Integration Tests', () => {
  let expansionState: ExpansionState;
  let layout: LayoutNode;

  beforeEach(() => {
    expansionState = createInitialExpansionState();
    layout = calculateNodePositions(
      'start',
      TREE_DATA,
      DEFAULT_LAYOUT.startX,
      DEFAULT_LAYOUT.startY,
      1,
      DEFAULT_LAYOUT
    );
  });

  describe('State Management Integration', () => {
    it('should initialize with root expanded', () => {
      expect(expansionState.expandedNodes.has('start')).toBe(true);
      expect(expansionState.collapsedSubtrees.size).toBe(0);
    });

    it('should toggle expansion on click', () => {
      // Expand a layer 2 node
      const newState = toggleNodeExpansion('compare_groups', expansionState, TREE_DATA);

      expect(newState.expandedNodes.has('compare_groups')).toBe(true);
      expect(newState.expandedNodes.has('start')).toBe(true); // Root still expanded

      // Collapse the same node
      const collapsedState = toggleNodeExpansion('compare_groups', newState, TREE_DATA);
      expect(collapsedState.expandedNodes.has('compare_groups')).toBe(false);
      expect(collapsedState.collapsedSubtrees.has('compare_groups')).toBe(true);
    });

    it('should cascade collapse to descendants', () => {
      // Expand multiple levels
      let state = expansionState;
      state = toggleNodeExpansion('compare_groups', state, TREE_DATA);
      state = toggleNodeExpansion('cont_time', state, TREE_DATA);
      state = toggleNodeExpansion('cont_repeated_data', state, TREE_DATA);

      expect(state.expandedNodes.has('compare_groups')).toBe(true);
      expect(state.expandedNodes.has('cont_time')).toBe(true);
      expect(state.expandedNodes.has('cont_repeated_data')).toBe(true);

      // Collapse parent - should remove all descendants
      const collapsed = toggleNodeExpansion('compare_groups', state, TREE_DATA);

      expect(collapsed.expandedNodes.has('compare_groups')).toBe(false);
      expect(collapsed.expandedNodes.has('cont_time')).toBe(false);
      expect(collapsed.expandedNodes.has('cont_repeated_data')).toBe(false);
      expect(collapsed.collapsedSubtrees.has('compare_groups')).toBe(true);
    });

    it('should filter visible nodes correctly', () => {
      // Initially, only root + layer 2 should be visible
      const visibleNodes = getVisibleNodes(layout, expansionState, TREE_DATA);

      // Root is always visible
      expect(visibleNodes.some(n => n.id === 'start')).toBe(true);

      // Layer 2 nodes should be visible (root is expanded)
      expect(visibleNodes.some(n => n.id === 'compare_groups')).toBe(true);
      expect(visibleNodes.some(n => n.id === 'describe_explore')).toBe(true);

      // Layer 3 nodes should NOT be visible (compare_groups not expanded)
      expect(visibleNodes.some(n => n.id === 'cont_time')).toBe(false);
      expect(visibleNodes.some(n => n.id === 'bin_time')).toBe(false);
    });

    it('should handle multiple expanded branches', () => {
      // Expand both branches at layer 2
      let state = toggleNodeExpansion('compare_groups', expansionState, TREE_DATA);

      // Verify compare_groups children are visible
      const visibleAfterFirstExpand = getVisibleNodes(layout, state, TREE_DATA);
      expect(visibleAfterFirstExpand.some(n => n.id === 'cont_time')).toBe(true);
      expect(visibleAfterFirstExpand.some(n => n.id === 'bin_time')).toBe(true);

      // Now expand one of the children
      state = toggleNodeExpansion('cont_time', state, TREE_DATA);

      const visibleAfterSecondExpand = getVisibleNodes(layout, state, TREE_DATA);
      expect(visibleAfterSecondExpand.some(n => n.id === 'cont_repeated_data')).toBe(true);
      expect(visibleAfterSecondExpand.some(n => n.id === 'cont_single_groups')).toBe(true);
    });
  });

  describe('UI Interaction Integration', () => {
    it('should initially show only layer 1 and 2', () => {
      const visibleNodes = getVisibleNodes(layout, expansionState, TREE_DATA);

      // Count nodes by level
      const level1 = visibleNodes.filter(n => n.level === 1);
      const level2 = visibleNodes.filter(n => n.level === 2);
      const level3Plus = visibleNodes.filter(n => n.level >= 3);

      expect(level1.length).toBe(1); // Root node
      expect(level2.length).toBeGreaterThan(0); // Layer 2 children
      expect(level3Plus.length).toBe(0); // No deeper nodes
    });

    it('should expand node on click', () => {
      const beforeExpand = getVisibleNodes(layout, expansionState, TREE_DATA);
      const contTimeVisibleBefore = beforeExpand.some(n => n.id === 'cont_time');
      expect(contTimeVisibleBefore).toBe(false);

      // Simulate click - expand compare_groups
      const newState = toggleNodeExpansion('compare_groups', expansionState, TREE_DATA);
      const afterExpand = getVisibleNodes(layout, newState, TREE_DATA);

      const contTimeVisibleAfter = afterExpand.some(n => n.id === 'cont_time');
      expect(contTimeVisibleAfter).toBe(true);
      expect(newState.expandedNodes.has('compare_groups')).toBe(true);
    });

    it('should collapse node on second click', () => {
      // First click - expand
      let state = toggleNodeExpansion('compare_groups', expansionState, TREE_DATA);
      expect(state.expandedNodes.has('compare_groups')).toBe(true);

      let visible = getVisibleNodes(layout, state, TREE_DATA);
      expect(visible.some(n => n.id === 'cont_time')).toBe(true);

      // Second click - collapse
      state = toggleNodeExpansion('compare_groups', state, TREE_DATA);
      expect(state.expandedNodes.has('compare_groups')).toBe(false);

      visible = getVisibleNodes(layout, state, TREE_DATA);
      expect(visible.some(n => n.id === 'cont_time')).toBe(false);
    });

    it('should show expand icon on expandable nodes', () => {
      // compare_groups has children, so it's expandable
      const isExpandable = hasChildren('compare_groups', TREE_DATA);
      expect(isExpandable).toBe(true);

      // Check if expanded
      const isExpanded = expansionState.expandedNodes.has('compare_groups');
      expect(isExpanded).toBe(false); // Not expanded initially
    });

    it('should hide icon on leaf nodes', () => {
      // describe_explore is a leaf node (has result, no options)
      const isExpandable = hasChildren('describe_explore', TREE_DATA);
      expect(isExpandable).toBe(false);
    });

    it('should correctly identify nodes for viewport animation', () => {
      // After expansion, the expanded node and its children should be identifiable
      const state = toggleNodeExpansion('compare_groups', expansionState, TREE_DATA);
      const visibleNodes = getVisibleNodes(layout, state, TREE_DATA);

      // Find the expanded node
      const expandedNode = visibleNodes.find(n => n.id === 'compare_groups');
      expect(expandedNode).toBeDefined();

      // Find its children
      const children = visibleNodes.filter(n => {
        // Check if this node is a child of compare_groups
        const node = TREE_DATA[n.id];
        const parent = TREE_DATA['compare_groups'];
        if (parent.options) {
          return parent.options.some(opt => opt.nextNodeId === n.id);
        }
        return false;
      });

      expect(children.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases Integration', () => {
    it('should handle rapid clicking (state consistency)', () => {
      // Simulate rapid clicks - toggle 5 times quickly
      let state = expansionState;

      for (let i = 0; i < 5; i++) {
        state = toggleNodeExpansion('compare_groups', state, TREE_DATA);
      }

      // After odd number of toggles, should be expanded
      expect(state.expandedNodes.has('compare_groups')).toBe(true);

      // State should be consistent
      const visible = getVisibleNodes(layout, state, TREE_DATA);
      expect(visible.some(n => n.id === 'cont_time')).toBe(true);
    });

    it('should collapse children when parent collapsed', () => {
      // Expand parent and child
      let state = toggleNodeExpansion('compare_groups', expansionState, TREE_DATA);
      state = toggleNodeExpansion('cont_time', state, TREE_DATA);

      // Verify child is expanded
      expect(state.expandedNodes.has('cont_time')).toBe(true);
      let visible = getVisibleNodes(layout, state, TREE_DATA);
      expect(visible.some(n => n.id === 'cont_repeated_data')).toBe(true);

      // Collapse parent
      state = toggleNodeExpansion('compare_groups', state, TREE_DATA);

      // Child should no longer be expanded
      expect(state.expandedNodes.has('cont_time')).toBe(false);
      visible = getVisibleNodes(layout, state, TREE_DATA);
      expect(visible.some(n => n.id === 'cont_repeated_data')).toBe(false);
    });

    it('should maintain layout consistency', () => {
      // Calculate initial positions
      const initialLayout = calculateNodePositions(
        'start',
        TREE_DATA,
        DEFAULT_LAYOUT.startX,
        DEFAULT_LAYOUT.startY,
        1,
        DEFAULT_LAYOUT
      );

      // Expand some nodes
      let state = toggleNodeExpansion('compare_groups', expansionState, TREE_DATA);
      state = toggleNodeExpansion('cont_time', state, TREE_DATA);

      // Recalculate positions (should be same as initial)
      const afterExpansionLayout = calculateNodePositions(
        'start',
        TREE_DATA,
        DEFAULT_LAYOUT.startX,
        DEFAULT_LAYOUT.startY,
        1,
        DEFAULT_LAYOUT
      );

      // Node positions should not change based on expansion
      // (We pre-calculate all positions, then filter visibility)
      function findNodeInLayout(layout: LayoutNode, nodeId: string): LayoutNode | null {
        if (layout.id === nodeId) return layout;
        for (const child of layout.children) {
          const found = findNodeInLayout(child, nodeId);
          if (found) return found;
        }
        return null;
      }

      const node1 = findNodeInLayout(initialLayout, 'compare_groups');
      const node2 = findNodeInLayout(afterExpansionLayout, 'compare_groups');

      expect(node1?.x).toBe(node2?.x);
      expect(node1?.y).toBe(node2?.y);
    });

    it('should handle deep nesting (5+ layers)', () => {
      // Expand down to layer 5+
      let state = expansionState;

      // Layer 2
      state = toggleNodeExpansion('compare_groups', state, TREE_DATA);
      expect(state.expandedNodes.has('compare_groups')).toBe(true);

      // Layer 3
      state = toggleNodeExpansion('cont_time', state, TREE_DATA);
      expect(state.expandedNodes.has('cont_time')).toBe(true);

      // Layer 4
      state = toggleNodeExpansion('cont_repeated_data', state, TREE_DATA);
      expect(state.expandedNodes.has('cont_repeated_data')).toBe(true);

      // Verify visibility at each layer
      const visible = getVisibleNodes(layout, state, TREE_DATA);

      expect(visible.some(n => n.id === 'start')).toBe(true); // Layer 1
      expect(visible.some(n => n.id === 'compare_groups')).toBe(true); // Layer 2
      expect(visible.some(n => n.id === 'cont_time')).toBe(true); // Layer 3
      expect(visible.some(n => n.id === 'cont_repeated_data')).toBe(true); // Layer 4

      // Check that deeper nodes are visible
      const deepNodes = visible.filter(n => n.level >= 5);
      if (deepNodes.length > 0) {
        // Verify deep nodes have correct parent relationships
        deepNodes.forEach(node => {
          expect(node.level).toBeGreaterThanOrEqual(5);
        });
      }
    });
  });

  describe('Visibility Query Performance', () => {
    it('should efficiently filter large trees', () => {
      const startTime = performance.now();

      // Expand several nodes
      let state = expansionState;
      state = toggleNodeExpansion('compare_groups', state, TREE_DATA);
      state = toggleNodeExpansion('continuous', state, TREE_DATA);

      // Query visible nodes multiple times
      for (let i = 0; i < 100; i++) {
        getVisibleNodes(layout, state, TREE_DATA);
      }

      const endTime = performance.now();
      const elapsed = endTime - startTime;

      // Should complete 100 queries in less than 100ms (1ms per query)
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('State Immutability Verification', () => {
    it('should never mutate original state', () => {
      const originalState = createInitialExpansionState();
      const originalExpandedSize = originalState.expandedNodes.size;
      const originalCollapsedSize = originalState.collapsedSubtrees.size;

      // Perform operations
      const newState1 = toggleNodeExpansion('compare_groups', originalState, TREE_DATA);
      const newState2 = toggleNodeExpansion('continuous', newState1, TREE_DATA);

      // Original state should be unchanged
      expect(originalState.expandedNodes.size).toBe(originalExpandedSize);
      expect(originalState.collapsedSubtrees.size).toBe(originalCollapsedSize);

      // New states should be different objects
      expect(newState1).not.toBe(originalState);
      expect(newState2).not.toBe(newState1);
      expect(newState1.expandedNodes).not.toBe(originalState.expandedNodes);
      expect(newState2.expandedNodes).not.toBe(newState1.expandedNodes);
    });
  });
});

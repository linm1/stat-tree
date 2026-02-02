/**
 * Phase 2-4 Tests: App.tsx rendering with expansion state
 *
 * Tests for:
 * - Phase 2: Visibility filtering in createNodesFromLayout
 * - Phase 3: Expansion state hooks
 * - Phase 4: Click handler with toggle logic
 */

import { TREE_DATA } from './data';
import {
  ExpansionState,
  createInitialExpansionState,
  isNodeVisible,
} from './utils/expansionState';
import { LayoutNode } from './utils/treeLayout';

describe('App.tsx Rendering with Expansion State', () => {
  describe('Phase 2: Visibility Filtering', () => {
    it('should only create shapes for visible nodes', () => {
      const state = createInitialExpansionState(); // Only root expanded
      const mockLayout: LayoutNode = {
        id: 'start',
        level: 1,
        x: 0,
        y: 0,
        children: [
          { id: 'compare_groups', level: 2, x: 300, y: 0, children: [] },
          { id: 'describe_explore', level: 2, x: 300, y: 200, children: [] }
        ]
      };

      // Root should be visible
      expect(isNodeVisible('start', mockLayout, state, TREE_DATA)).toBe(true);

      // Children should be visible (parent expanded)
      expect(isNodeVisible('compare_groups', mockLayout.children[0], state, TREE_DATA)).toBe(true);
      expect(isNodeVisible('describe_explore', mockLayout.children[1], state, TREE_DATA)).toBe(true);
    });

    it('should skip invisible nodes when parent not expanded', () => {
      const state: ExpansionState = {
        expandedNodes: new Set(['start']), // compare_groups NOT expanded
        collapsedSubtrees: new Set()
      };

      const deepNode: LayoutNode = {
        id: 'cont_time',
        level: 3,
        x: 600,
        y: 0,
        children: []
      };

      // Deep node should NOT be visible (parent not expanded)
      expect(isNodeVisible('cont_time', deepNode, state, TREE_DATA)).toBe(false);
    });

    it('should not create edges for invisible nodes', () => {
      const state: ExpansionState = {
        expandedNodes: new Set(['start']),
        collapsedSubtrees: new Set()
      };

      const parentNode: LayoutNode = {
        id: 'compare_groups',
        level: 2,
        x: 300,
        y: 0,
        children: [
          { id: 'cont_time', level: 3, x: 600, y: 0, children: [] }
        ]
      };

      // Parent is visible
      expect(isNodeVisible('compare_groups', parentNode, state, TREE_DATA)).toBe(true);

      // Child should NOT be visible (parent not expanded)
      expect(isNodeVisible('cont_time', parentNode.children[0], state, TREE_DATA)).toBe(false);

      // Therefore, no edge should be created between them
    });
  });

  describe('Phase 3: Expansion State Hooks', () => {
    it('should initialize with root expanded', () => {
      const initialState = createInitialExpansionState();

      expect(initialState.expandedNodes.has('start')).toBe(true);
      expect(initialState.collapsedSubtrees.size).toBe(0);
    });

    it('should render only Layer 1 and Layer 2 initially', () => {
      const state = createInitialExpansionState();

      // Layer 1 node (root)
      const rootNode: LayoutNode = {
        id: 'start',
        level: 1,
        x: 0,
        y: 0,
        children: []
      };

      // Layer 2 nodes
      const layer2Node: LayoutNode = {
        id: 'compare_groups',
        level: 2,
        x: 300,
        y: 0,
        children: []
      };

      // Layer 3 nodes (should NOT be visible yet)
      const layer3Node: LayoutNode = {
        id: 'cont_time',
        level: 3,
        x: 600,
        y: 0,
        children: []
      };

      expect(isNodeVisible('start', rootNode, state, TREE_DATA)).toBe(true);
      expect(isNodeVisible('compare_groups', layer2Node, state, TREE_DATA)).toBe(true);
      expect(isNodeVisible('cont_time', layer3Node, state, TREE_DATA)).toBe(false);
    });
  });

  describe('Phase 4: Click Handler Logic', () => {
    it('should detect if a node has children (expandable)', () => {
      const { hasChildren } = require('./utils/expansionState');

      expect(hasChildren('start', TREE_DATA)).toBe(true);
      expect(hasChildren('compare_groups', TREE_DATA)).toBe(true);
      expect(hasChildren('describe_explore', TREE_DATA)).toBe(false); // Leaf node
    });

    it('should toggle expansion state on click', () => {
      const { toggleNodeExpansion } = require('./utils/expansionState');

      const initial = createInitialExpansionState();

      // Expand compare_groups
      const expanded = toggleNodeExpansion('compare_groups', initial, TREE_DATA);
      expect(expanded.expandedNodes.has('compare_groups')).toBe(true);

      // Collapse compare_groups
      const collapsed = toggleNodeExpansion('compare_groups', expanded, TREE_DATA);
      expect(collapsed.expandedNodes.has('compare_groups')).toBe(false);
      expect(collapsed.collapsedSubtrees.has('compare_groups')).toBe(true);
    });

    it('should reveal children when node is expanded', () => {
      const { toggleNodeExpansion } = require('./utils/expansionState');

      let state = createInitialExpansionState();

      // Expand compare_groups
      state = toggleNodeExpansion('compare_groups', state, TREE_DATA);

      // Now Layer 3 children should be visible
      const layer3Node: LayoutNode = {
        id: 'cont_time',
        level: 3,
        x: 600,
        y: 0,
        children: []
      };

      expect(isNodeVisible('cont_time', layer3Node, state, TREE_DATA)).toBe(true);
    });

    it('should hide children when node is collapsed', () => {
      const { toggleNodeExpansion } = require('./utils/expansionState');

      let state: ExpansionState = {
        expandedNodes: new Set(['start', 'compare_groups']),
        collapsedSubtrees: new Set()
      };

      // Collapse compare_groups
      state = toggleNodeExpansion('compare_groups', state, TREE_DATA);

      // Layer 3 children should no longer be visible
      const layer3Node: LayoutNode = {
        id: 'cont_time',
        level: 3,
        x: 600,
        y: 0,
        children: []
      };

      expect(isNodeVisible('cont_time', layer3Node, state, TREE_DATA)).toBe(false);
    });

    it('should cascade collapse to all descendants', () => {
      const { toggleNodeExpansion } = require('./utils/expansionState');

      let state: ExpansionState = {
        expandedNodes: new Set(['start', 'compare_groups', 'cont_time']),
        collapsedSubtrees: new Set()
      };

      // Collapse compare_groups (parent)
      state = toggleNodeExpansion('compare_groups', state, TREE_DATA);

      // All descendants should also be collapsed
      expect(state.expandedNodes.has('cont_time')).toBe(false);
      expect(state.collapsedSubtrees.has('compare_groups')).toBe(true);
    });

    it('should not toggle root node (always expanded)', () => {
      const { toggleNodeExpansion } = require('./utils/expansionState');

      const initial = createInitialExpansionState();
      const attempted = toggleNodeExpansion('start', initial, TREE_DATA);

      // Root should still be expanded
      expect(attempted.expandedNodes.has('start')).toBe(true);
    });
  });

  describe('Edge Detection and Routing with Visibility', () => {
    it('should only route edges between visible nodes', () => {
      const state: ExpansionState = {
        expandedNodes: new Set(['start']),
        collapsedSubtrees: new Set()
      };

      const parentNode: LayoutNode = {
        id: 'compare_groups',
        level: 2,
        x: 300,
        y: 0,
        children: [
          { id: 'cont_time', level: 3, x: 600, y: 0, children: [] }
        ]
      };

      // Edge from start -> compare_groups: VALID (both visible)
      const startNode: LayoutNode = { id: 'start', level: 1, x: 0, y: 0, children: [parentNode] };
      expect(isNodeVisible('start', startNode, state, TREE_DATA)).toBe(true);
      expect(isNodeVisible('compare_groups', parentNode, state, TREE_DATA)).toBe(true);

      // Edge from compare_groups -> cont_time: INVALID (cont_time not visible)
      expect(isNodeVisible('cont_time', parentNode.children[0], state, TREE_DATA)).toBe(false);
    });
  });

  describe('Shape Updates on Expand/Collapse', () => {
    it('should add new shapes when expanding', () => {
      const { getVisibleNodes } = require('./utils/expansionState');

      const state = createInitialExpansionState();
      const mockLayout: LayoutNode = {
        id: 'start',
        level: 1,
        x: 0,
        y: 0,
        children: [
          {
            id: 'compare_groups',
            level: 2,
            x: 300,
            y: 0,
            children: [
              { id: 'cont_time', level: 3, x: 600, y: 0, children: [] }
            ]
          }
        ]
      };

      // Initial: root + compare_groups visible
      const initialVisible = getVisibleNodes(mockLayout, state, TREE_DATA);
      expect(initialVisible.map((n: LayoutNode) => n.id)).toContain('start');
      expect(initialVisible.map((n: LayoutNode) => n.id)).toContain('compare_groups');
      expect(initialVisible.map((n: LayoutNode) => n.id)).not.toContain('cont_time');

      // After expanding compare_groups
      const { toggleNodeExpansion } = require('./utils/expansionState');
      const expandedState = toggleNodeExpansion('compare_groups', state, TREE_DATA);
      const expandedVisible = getVisibleNodes(mockLayout, expandedState, TREE_DATA);

      expect(expandedVisible.map((n: LayoutNode) => n.id)).toContain('cont_time');
    });

    it('should remove shapes when collapsing', () => {
      const { getVisibleNodes, toggleNodeExpansion } = require('./utils/expansionState');

      let state: ExpansionState = {
        expandedNodes: new Set(['start', 'compare_groups']),
        collapsedSubtrees: new Set()
      };

      const mockLayout: LayoutNode = {
        id: 'start',
        level: 1,
        x: 0,
        y: 0,
        children: [
          {
            id: 'compare_groups',
            level: 2,
            x: 300,
            y: 0,
            children: [
              { id: 'cont_time', level: 3, x: 600, y: 0, children: [] }
            ]
          }
        ]
      };

      // Before collapse: cont_time visible
      const beforeVisible = getVisibleNodes(mockLayout, state, TREE_DATA);
      expect(beforeVisible.map((n: LayoutNode) => n.id)).toContain('cont_time');

      // After collapsing compare_groups
      const collapsedState = toggleNodeExpansion('compare_groups', state, TREE_DATA);
      const afterVisible = getVisibleNodes(mockLayout, collapsedState, TREE_DATA);

      expect(afterVisible.map((n: LayoutNode) => n.id)).not.toContain('compare_groups');
      expect(afterVisible.map((n: LayoutNode) => n.id)).not.toContain('cont_time');
    });
  });
});

/**
 * Integration Tests for Click Behavior in App Component
 *
 * Tests the integration of click behavior logic with the App component,
 * verifying that expandable nodes toggle and leaf nodes navigate.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  determineClickAction,
  shouldNavigateOnClick,
  shouldToggleOnClick
} from './utils/clickBehavior';
import {
  ExpansionState,
  createInitialExpansionState,
  toggleNodeExpansion
} from './utils/expansionState';
import { TREE_DATA } from './data';

describe('App Click Behavior Integration', () => {
  let expansionState: ExpansionState;

  beforeEach(() => {
    expansionState = createInitialExpansionState();
  });

  describe('Click Handler Integration', () => {
    it('should expand collapsed nodes when clicked', () => {
      // Given: compare_groups is collapsed (not in expandedNodes)
      expect(expansionState.expandedNodes.has('compare_groups')).toBe(false);

      // When: User clicks compare_groups
      const clickResult = determineClickAction('compare_groups', false, TREE_DATA);

      // Then: Action should be 'expand'
      expect(clickResult.action).toBe('expand');

      // And: Applying the action should expand the node
      const newState = toggleNodeExpansion('compare_groups', expansionState, TREE_DATA);
      expect(newState.expandedNodes.has('compare_groups')).toBe(true);
    });

    it('should collapse expanded nodes when clicked', () => {
      // Given: compare_groups is expanded
      const expandedState = toggleNodeExpansion('compare_groups', expansionState, TREE_DATA);
      expect(expandedState.expandedNodes.has('compare_groups')).toBe(true);

      // When: User clicks compare_groups again
      const clickResult = determineClickAction('compare_groups', true, TREE_DATA);

      // Then: Action should be 'collapse'
      expect(clickResult.action).toBe('collapse');

      // And: Applying the action should collapse the node
      const newState = toggleNodeExpansion('compare_groups', expandedState, TREE_DATA);
      expect(newState.expandedNodes.has('compare_groups')).toBe(false);
    });

    it('should navigate to flow tab for leaf nodes (not toggle)', () => {
      // Given: describe_explore is a leaf node
      const isLeaf = shouldNavigateOnClick('describe_explore', TREE_DATA);
      expect(isLeaf).toBe(true);

      // When: User clicks describe_explore
      const clickResult = determineClickAction('describe_explore', false, TREE_DATA);

      // Then: Action should be 'navigate' (not expand/collapse)
      expect(clickResult.action).toBe('navigate');

      // And: It should not be toggleable
      const shouldToggle = shouldToggleOnClick('describe_explore', TREE_DATA);
      expect(shouldToggle).toBe(false);
    });
  });

  describe('Click Flow Scenarios', () => {
    it('should support expanding deep nested paths', () => {
      let state = expansionState;

      // Layer 2: expand compare_groups
      let action = determineClickAction('compare_groups', state.expandedNodes.has('compare_groups'), TREE_DATA);
      expect(action.action).toBe('expand');
      state = toggleNodeExpansion('compare_groups', state, TREE_DATA);

      // Layer 3: expand cont_time
      action = determineClickAction('cont_time', state.expandedNodes.has('cont_time'), TREE_DATA);
      expect(action.action).toBe('expand');
      state = toggleNodeExpansion('cont_time', state, TREE_DATA);

      // Layer 4: expand cont_repeated_data
      action = determineClickAction('cont_repeated_data', state.expandedNodes.has('cont_repeated_data'), TREE_DATA);
      expect(action.action).toBe('expand');
      state = toggleNodeExpansion('cont_repeated_data', state, TREE_DATA);

      // Verify all are expanded
      expect(state.expandedNodes.has('compare_groups')).toBe(true);
      expect(state.expandedNodes.has('cont_time')).toBe(true);
      expect(state.expandedNodes.has('cont_repeated_data')).toBe(true);
    });

    it('should navigate when reaching a leaf node at end of path', () => {
      // Expand path to a leaf
      let state = expansionState;
      state = toggleNodeExpansion('compare_groups', state, TREE_DATA);
      state = toggleNodeExpansion('cont_time', state, TREE_DATA);
      state = toggleNodeExpansion('cont_repeated_data', state, TREE_DATA);

      // Find a leaf node in the real data at this depth
      const node = TREE_DATA['cont_repeated_data'];
      if (node.options && node.options.length > 0) {
        const possibleLeafId = node.options[0].nextNodeId;
        const possibleLeaf = TREE_DATA[possibleLeafId];

        // Check if it's a leaf
        if (possibleLeaf && (!possibleLeaf.options || possibleLeaf.options.length === 0)) {
          // This is a leaf - should navigate
          const action = determineClickAction(possibleLeafId, false, TREE_DATA);
          expect(action.action).toBe('navigate');
        }
      }
    });

    it('should allow collapsing at any level', () => {
      // Expand deeply
      let state = expansionState;
      state = toggleNodeExpansion('compare_groups', state, TREE_DATA);
      state = toggleNodeExpansion('cont_time', state, TREE_DATA);
      state = toggleNodeExpansion('cont_repeated_data', state, TREE_DATA);

      // Collapse middle level (cont_time)
      const action = determineClickAction('cont_time', state.expandedNodes.has('cont_time'), TREE_DATA);
      expect(action.action).toBe('collapse');

      state = toggleNodeExpansion('cont_time', state, TREE_DATA);

      // cont_time and its descendants should be collapsed
      expect(state.expandedNodes.has('cont_time')).toBe(false);
      expect(state.expandedNodes.has('cont_repeated_data')).toBe(false);
    });
  });

  describe('Real Data Coverage', () => {
    it('should correctly handle all nodes in the tree', () => {
      let expandableCount = 0;
      let leafCount = 0;

      Object.keys(TREE_DATA).forEach(nodeId => {
        const node = TREE_DATA[nodeId];

        if (node.options && node.options.length > 0) {
          // Expandable node
          expandableCount++;
          const shouldToggle = shouldToggleOnClick(nodeId, TREE_DATA);
          expect(shouldToggle).toBe(true);

          const expandAction = determineClickAction(nodeId, false, TREE_DATA);
          expect(expandAction.action).toBe('expand');

          const collapseAction = determineClickAction(nodeId, true, TREE_DATA);
          expect(collapseAction.action).toBe('collapse');
        } else {
          // Leaf node
          leafCount++;
          const shouldNav = shouldNavigateOnClick(nodeId, TREE_DATA);
          expect(shouldNav).toBe(true);

          const action = determineClickAction(nodeId, false, TREE_DATA);
          expect(action.action).toBe('navigate');
        }
      });

      // Verify we tested both types
      expect(expandableCount).toBeGreaterThan(0);
      expect(leafCount).toBeGreaterThan(0);
    });
  });

  describe('Expected User Flows', () => {
    it('should support "Compare Groups → Continuous → Repeated Measures → Result" flow', () => {
      let state = expansionState;

      // Click compare_groups → expand
      let action = determineClickAction('compare_groups', false, TREE_DATA);
      expect(action.action).toBe('expand');
      state = toggleNodeExpansion('compare_groups', state, TREE_DATA);

      // Click cont_time → expand
      action = determineClickAction('cont_time', false, TREE_DATA);
      expect(action.action).toBe('expand');
      state = toggleNodeExpansion('cont_time', state, TREE_DATA);

      // Click cont_repeated_data → expand
      action = determineClickAction('cont_repeated_data', false, TREE_DATA);
      expect(action.action).toBe('expand');
      state = toggleNodeExpansion('cont_repeated_data', state, TREE_DATA);

      // At this point, user might click a result node → navigate
      const node = TREE_DATA['cont_repeated_data'];
      if (node.options) {
        const firstOptionId = node.options[0].nextNodeId;
        const firstOptionNode = TREE_DATA[firstOptionId];

        if (!firstOptionNode.options || firstOptionNode.options.length === 0) {
          // This is a leaf - should navigate
          action = determineClickAction(firstOptionId, false, TREE_DATA);
          expect(action.action).toBe('navigate');
        }
      }
    });

    it('should support "Describe/Explore" immediate navigation', () => {
      // Click describe_explore (leaf) → navigate immediately
      const action = determineClickAction('describe_explore', false, TREE_DATA);
      expect(action.action).toBe('navigate');

      // Should NOT modify expansion state
      // (leaf nodes don't expand/collapse)
    });
  });

  describe('Edge Cases', () => {
    it('should handle clicking root node', () => {
      // Root is always expanded, so clicking should collapse it
      const action = determineClickAction('start', true, TREE_DATA);
      expect(action.action).toBe('collapse');

      // Note: In practice, root should not be collapsible (protected)
      // But click behavior logic just determines what SHOULD happen
    });

    it('should be consistent across rapid clicks', () => {
      const nodeId = 'compare_groups';
      let state = expansionState;

      // Rapid clicks: expand, collapse, expand, collapse
      for (let i = 0; i < 4; i++) {
        const isExpanded = state.expandedNodes.has(nodeId);
        const action = determineClickAction(nodeId, isExpanded, TREE_DATA);

        if (i % 2 === 0) {
          expect(action.action).toBe('expand');
        } else {
          expect(action.action).toBe('collapse');
        }

        state = toggleNodeExpansion(nodeId, state, TREE_DATA);
      }

      // After 4 toggles (even number), should be back to initial state
      expect(state.expandedNodes.has(nodeId)).toBe(false);
    });
  });
});

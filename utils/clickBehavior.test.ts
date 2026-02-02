/**
 * Tests for Click Behavior Module
 *
 * Follows TDD methodology: Tests written FIRST (RED phase)
 */

import { describe, it, expect } from '@jest/globals';
import {
  determineClickAction,
  shouldNavigateOnClick,
  shouldToggleOnClick,
  ClickAction
} from './clickBehavior';
import { TreeData } from '../types';

describe('Click Behavior Module', () => {
  // Test data setup
  const mockTreeData: TreeData = {
    expandable_node: {
      id: 'expandable_node',
      question: 'Expandable Node',
      description: 'A node with children',
      options: [
        { label: 'Child 1', description: 'First child', nextNodeId: 'child1' },
        { label: 'Child 2', description: 'Second child', nextNodeId: 'child2' }
      ]
    },
    leaf_node: {
      id: 'leaf_node',
      question: 'Leaf Node',
      description: 'A node without children',
      result: {
        procedures: ['PROC TEST'],
        briefing: 'Test procedure',
        examples: []
      }
    },
    empty_options_node: {
      id: 'empty_options_node',
      question: 'Empty Options Node',
      description: 'A node with empty options array',
      options: []
    }
  };

  describe('determineClickAction', () => {
    describe('Expandable Nodes', () => {
      it('should return "expand" when collapsed expandable node is clicked', () => {
        const result = determineClickAction('expandable_node', false, mockTreeData);

        expect(result.action).toBe('expand');
        expect(result.nodeId).toBe('expandable_node');
      });

      it('should return "collapse" when expanded expandable node is clicked', () => {
        const result = determineClickAction('expandable_node', true, mockTreeData);

        expect(result.action).toBe('collapse');
        expect(result.nodeId).toBe('expandable_node');
      });
    });

    describe('Leaf Nodes', () => {
      it('should return "navigate" when leaf node is clicked (not expanded)', () => {
        const result = determineClickAction('leaf_node', false, mockTreeData);

        expect(result.action).toBe('navigate');
        expect(result.nodeId).toBe('leaf_node');
      });

      it('should return "navigate" when leaf node is clicked (even if marked as expanded)', () => {
        // Edge case: leaf node shouldn't be expandable, but if state says it's expanded,
        // still navigate (leaf nodes have no children to collapse)
        const result = determineClickAction('leaf_node', true, mockTreeData);

        expect(result.action).toBe('navigate');
        expect(result.nodeId).toBe('leaf_node');
      });

      it('should return "navigate" for node with empty options array', () => {
        const result = determineClickAction('empty_options_node', false, mockTreeData);

        expect(result.action).toBe('navigate');
        expect(result.nodeId).toBe('empty_options_node');
      });
    });

    describe('Error Handling', () => {
      it('should throw error when node does not exist', () => {
        expect(() => {
          determineClickAction('nonexistent_node', false, mockTreeData);
        }).toThrow('Node not found: nonexistent_node');
      });
    });
  });

  describe('shouldNavigateOnClick', () => {
    it('should return true for leaf nodes', () => {
      const result = shouldNavigateOnClick('leaf_node', mockTreeData);
      expect(result).toBe(true);
    });

    it('should return true for nodes with empty options array', () => {
      const result = shouldNavigateOnClick('empty_options_node', mockTreeData);
      expect(result).toBe(true);
    });

    it('should return false for expandable nodes', () => {
      const result = shouldNavigateOnClick('expandable_node', mockTreeData);
      expect(result).toBe(false);
    });

    it('should return false when node does not exist', () => {
      const result = shouldNavigateOnClick('nonexistent_node', mockTreeData);
      expect(result).toBe(false);
    });
  });

  describe('shouldToggleOnClick', () => {
    it('should return true for expandable nodes', () => {
      const result = shouldToggleOnClick('expandable_node', mockTreeData);
      expect(result).toBe(true);
    });

    it('should return false for leaf nodes', () => {
      const result = shouldToggleOnClick('leaf_node', mockTreeData);
      expect(result).toBe(false);
    });

    it('should return false for nodes with empty options array', () => {
      const result = shouldToggleOnClick('empty_options_node', mockTreeData);
      expect(result).toBe(false);
    });

    it('should return false when node does not exist', () => {
      const result = shouldToggleOnClick('nonexistent_node', mockTreeData);
      expect(result).toBe(false);
    });
  });

  describe('Real Data Integration', () => {
    // Import real tree data for integration testing
    const { TREE_DATA } = require('../data');

    it('should identify "compare_groups" as expandable', () => {
      const result = shouldToggleOnClick('compare_groups', TREE_DATA);
      expect(result).toBe(true);

      const action = determineClickAction('compare_groups', false, TREE_DATA);
      expect(action.action).toBe('expand');
    });

    it('should identify "describe_explore" as navigable (leaf)', () => {
      const result = shouldNavigateOnClick('describe_explore', TREE_DATA);
      expect(result).toBe(true);

      const action = determineClickAction('describe_explore', false, TREE_DATA);
      expect(action.action).toBe('navigate');
    });

    it('should identify "cont_time" as expandable', () => {
      const result = shouldToggleOnClick('cont_time', TREE_DATA);
      expect(result).toBe(true);

      const action = determineClickAction('cont_time', false, TREE_DATA);
      expect(action.action).toBe('expand');
    });

    it('should handle all leaf nodes in real data correctly', () => {
      // Find all leaf nodes (nodes with result property and no options)
      const leafNodes = Object.keys(TREE_DATA).filter(nodeId => {
        const node = TREE_DATA[nodeId];
        return node.result && (!node.options || node.options.length === 0);
      });

      // All leaf nodes should navigate
      leafNodes.forEach(nodeId => {
        const shouldNav = shouldNavigateOnClick(nodeId, TREE_DATA);
        expect(shouldNav).toBe(true);

        const action = determineClickAction(nodeId, false, TREE_DATA);
        expect(action.action).toBe('navigate');
      });

      // Ensure we found some leaf nodes
      expect(leafNodes.length).toBeGreaterThan(0);
    });

    it('should handle all expandable nodes in real data correctly', () => {
      // Find all expandable nodes (nodes with options)
      const expandableNodes = Object.keys(TREE_DATA).filter(nodeId => {
        const node = TREE_DATA[nodeId];
        return node.options && node.options.length > 0;
      });

      // All expandable nodes should toggle
      expandableNodes.forEach(nodeId => {
        const shouldToggle = shouldToggleOnClick(nodeId, TREE_DATA);
        expect(shouldToggle).toBe(true);

        const action = determineClickAction(nodeId, false, TREE_DATA);
        expect(action.action).toBe('expand');
      });

      // Ensure we found some expandable nodes
      expect(expandableNodes.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle node with undefined options (treated as leaf)', () => {
      const dataWithUndefined: TreeData = {
        undefined_options_node: {
          id: 'undefined_options_node',
          question: 'Undefined Options',
          description: 'Node with undefined options'
          // No options property
        } as any
      };

      const shouldNav = shouldNavigateOnClick('undefined_options_node', dataWithUndefined);
      expect(shouldNav).toBe(true);

      const action = determineClickAction('undefined_options_node', false, dataWithUndefined);
      expect(action.action).toBe('navigate');
    });

    it('should consistently handle collapsed and expanded states', () => {
      // Collapsed → Expand
      const collapsed = determineClickAction('expandable_node', false, mockTreeData);
      expect(collapsed.action).toBe('expand');

      // Expanded → Collapse
      const expanded = determineClickAction('expandable_node', true, mockTreeData);
      expect(expanded.action).toBe('collapse');

      // Toggling twice should return to original state
      expect(collapsed.action).not.toBe(expanded.action);
    });
  });

  describe('Type Safety', () => {
    it('should return correct ClickAction type', () => {
      const expand = determineClickAction('expandable_node', false, mockTreeData);
      const collapse = determineClickAction('expandable_node', true, mockTreeData);
      const navigate = determineClickAction('leaf_node', false, mockTreeData);

      // TypeScript compile-time check (these should not cause errors)
      const action1: ClickAction = expand.action;
      const action2: ClickAction = collapse.action;
      const action3: ClickAction = navigate.action;

      expect(['expand', 'collapse', 'navigate']).toContain(action1);
      expect(['expand', 'collapse', 'navigate']).toContain(action2);
      expect(['expand', 'collapse', 'navigate']).toContain(action3);
    });
  });
});

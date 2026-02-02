import { TREE_DATA } from '../data';
import {
  ExpansionState,
  createInitialExpansionState,
  toggleNodeExpansion,
  expandNode,
  collapseNode,
  isNodeVisible,
  getVisibleNodes,
  getAllDescendants,
  getAncestors,
  hasChildren,
} from './expansionState';

describe('expansionState', () => {
  describe('createInitialExpansionState', () => {
    it('should create initial state with root expanded', () => {
      const state = createInitialExpansionState();

      expect(state.expandedNodes.has('start')).toBe(true);
      expect(state.collapsedSubtrees.size).toBe(0);
    });

    it('should return a new Set instance (immutable)', () => {
      const state1 = createInitialExpansionState();
      const state2 = createInitialExpansionState();

      expect(state1.expandedNodes).not.toBe(state2.expandedNodes);
      expect(state1.collapsedSubtrees).not.toBe(state2.collapsedSubtrees);
    });
  });

  describe('hasChildren', () => {
    it('should return true for nodes with options', () => {
      expect(hasChildren('start', TREE_DATA)).toBe(true);
      expect(hasChildren('compare_groups', TREE_DATA)).toBe(true);
      expect(hasChildren('cont_time', TREE_DATA)).toBe(true);
    });

    it('should return false for leaf nodes (result nodes)', () => {
      expect(hasChildren('describe_explore', TREE_DATA)).toBe(false);
    });

    it('should return false for non-existent nodes', () => {
      expect(hasChildren('non_existent', TREE_DATA)).toBe(false);
    });

    it('should return false for nodes with empty options array', () => {
      const testData = {
        test_node: {
          id: 'test_node',
          question: 'Test',
          options: []
        }
      };
      expect(hasChildren('test_node', testData as any)).toBe(false);
    });
  });

  describe('getAllDescendants', () => {
    it('should return all descendants of a node', () => {
      const descendants = getAllDescendants('start', TREE_DATA);

      expect(descendants).toContain('compare_groups');
      expect(descendants).toContain('describe_explore');
      expect(descendants.length).toBeGreaterThan(2);
    });

    it('should return all descendants recursively', () => {
      const descendants = getAllDescendants('compare_groups', TREE_DATA);

      // Should include direct children (Layer 3)
      expect(descendants).toContain('cont_time');
      expect(descendants).toContain('bin_time');
      expect(descendants).toContain('count_check');
      expect(descendants).toContain('tte_type');
      expect(descendants).toContain('ord_type');

      // Should also include deeper descendants (Layer 4+)
      expect(descendants.length).toBeGreaterThan(5);
    });

    it('should return empty array for leaf nodes', () => {
      const descendants = getAllDescendants('describe_explore', TREE_DATA);

      expect(descendants).toEqual([]);
    });

    it('should return empty array for non-existent nodes', () => {
      const descendants = getAllDescendants('non_existent', TREE_DATA);

      expect(descendants).toEqual([]);
    });

    it('should not include the node itself', () => {
      const descendants = getAllDescendants('start', TREE_DATA);

      expect(descendants).not.toContain('start');
    });
  });

  describe('getAncestors', () => {
    it('should return empty array for root node', () => {
      const ancestors = getAncestors('start', TREE_DATA);

      expect(ancestors).toEqual([]);
    });

    it('should return all ancestors in order from root to parent', () => {
      // For a deep node, should return path from root
      const node = TREE_DATA['compare_groups'];
      if (node?.options?.[0]) {
        const childId = node.options[0].nextNodeId;
        const ancestors = getAncestors(childId, TREE_DATA);

        expect(ancestors).toContain('start');
        expect(ancestors).toContain('compare_groups');
        expect(ancestors[0]).toBe('start');
      }
    });

    it('should return empty array for non-existent nodes', () => {
      const ancestors = getAncestors('non_existent', TREE_DATA);

      expect(ancestors).toEqual([]);
    });

    it('should not include the node itself', () => {
      const ancestors = getAncestors('compare_groups', TREE_DATA);

      expect(ancestors).not.toContain('compare_groups');
    });
  });

  describe('expandNode', () => {
    it('should add node to expandedNodes set', () => {
      const initial = createInitialExpansionState();
      const result = expandNode('compare_groups', initial);

      expect(result.expandedNodes.has('compare_groups')).toBe(true);
      expect(result.expandedNodes.has('start')).toBe(true); // Preserves existing
    });

    it('should remove node from collapsedSubtrees if present', () => {
      const initial: ExpansionState = {
        expandedNodes: new Set(['start']),
        collapsedSubtrees: new Set(['compare_groups'])
      };
      const result = expandNode('compare_groups', initial);

      expect(result.collapsedSubtrees.has('compare_groups')).toBe(false);
    });

    it('should not mutate the original state', () => {
      const initial = createInitialExpansionState();
      const initialExpandedCount = initial.expandedNodes.size;

      expandNode('compare_groups', initial);

      expect(initial.expandedNodes.size).toBe(initialExpandedCount);
    });

    it('should handle expanding already expanded node (idempotent)', () => {
      const initial = createInitialExpansionState();
      const result1 = expandNode('compare_groups', initial);
      const result2 = expandNode('compare_groups', result1);

      expect(result2.expandedNodes.has('compare_groups')).toBe(true);
      expect(result2.expandedNodes.size).toBe(result1.expandedNodes.size);
    });
  });

  describe('collapseNode', () => {
    it('should remove node from expandedNodes', () => {
      const initial: ExpansionState = {
        expandedNodes: new Set(['start', 'compare_groups']),
        collapsedSubtrees: new Set()
      };
      const result = collapseNode('compare_groups', initial, TREE_DATA);

      expect(result.expandedNodes.has('compare_groups')).toBe(false);
    });

    it('should add node to collapsedSubtrees', () => {
      const initial: ExpansionState = {
        expandedNodes: new Set(['start', 'compare_groups']),
        collapsedSubtrees: new Set()
      };
      const result = collapseNode('compare_groups', initial, TREE_DATA);

      expect(result.collapsedSubtrees.has('compare_groups')).toBe(true);
    });

    it('should cascade collapse to all descendants', () => {
      // Expand multiple levels
      let state: ExpansionState = {
        expandedNodes: new Set(['start', 'compare_groups', 'cont_time']),
        collapsedSubtrees: new Set()
      };

      // Collapse parent
      const result = collapseNode('compare_groups', state, TREE_DATA);

      // All descendants should be removed from expanded
      expect(result.expandedNodes.has('cont_time')).toBe(false);
      expect(result.expandedNodes.has('compare_groups')).toBe(false);
    });

    it('should not mutate the original state', () => {
      const initial: ExpansionState = {
        expandedNodes: new Set(['start', 'compare_groups']),
        collapsedSubtrees: new Set()
      };
      const initialExpandedCount = initial.expandedNodes.size;

      collapseNode('compare_groups', initial, TREE_DATA);

      expect(initial.expandedNodes.size).toBe(initialExpandedCount);
    });

    it('should handle collapsing already collapsed node (idempotent)', () => {
      const initial = createInitialExpansionState();
      const result1 = collapseNode('compare_groups', initial, TREE_DATA);
      const result2 = collapseNode('compare_groups', result1, TREE_DATA);

      expect(result2.expandedNodes.has('compare_groups')).toBe(false);
      expect(result2.collapsedSubtrees.has('compare_groups')).toBe(true);
    });

    it('should not collapse root node', () => {
      const initial = createInitialExpansionState();
      const result = collapseNode('start', initial, TREE_DATA);

      // Root should remain expanded
      expect(result.expandedNodes.has('start')).toBe(true);
    });
  });

  describe('toggleNodeExpansion', () => {
    it('should expand collapsed node', () => {
      const initial = createInitialExpansionState();
      const result = toggleNodeExpansion('compare_groups', initial, TREE_DATA);

      expect(result.expandedNodes.has('compare_groups')).toBe(true);
    });

    it('should collapse expanded node', () => {
      const initial: ExpansionState = {
        expandedNodes: new Set(['start', 'compare_groups']),
        collapsedSubtrees: new Set()
      };
      const result = toggleNodeExpansion('compare_groups', initial, TREE_DATA);

      expect(result.expandedNodes.has('compare_groups')).toBe(false);
      expect(result.collapsedSubtrees.has('compare_groups')).toBe(true);
    });

    it('should not toggle root node (always expanded)', () => {
      const initial = createInitialExpansionState();
      const result = toggleNodeExpansion('start', initial, TREE_DATA);

      expect(result.expandedNodes.has('start')).toBe(true);
    });

    it('should not mutate original state', () => {
      const initial = createInitialExpansionState();
      const initialExpandedCount = initial.expandedNodes.size;

      toggleNodeExpansion('compare_groups', initial, TREE_DATA);

      expect(initial.expandedNodes.size).toBe(initialExpandedCount);
    });
  });

  describe('isNodeVisible', () => {
    it('should return true for root node (always visible)', () => {
      const state = createInitialExpansionState();
      const mockLayoutNode = {
        id: 'start',
        level: 1,
        x: 0,
        y: 0,
        children: []
      };

      expect(isNodeVisible('start', mockLayoutNode, state, TREE_DATA)).toBe(true);
    });

    it('should return true for direct children of expanded nodes', () => {
      const state: ExpansionState = {
        expandedNodes: new Set(['start']),
        collapsedSubtrees: new Set()
      };
      const mockLayoutNode = {
        id: 'compare_groups',
        level: 2,
        x: 0,
        y: 0,
        children: []
      };

      expect(isNodeVisible('compare_groups', mockLayoutNode, state, TREE_DATA)).toBe(true);
    });

    it('should return false if parent is not expanded', () => {
      const state: ExpansionState = {
        expandedNodes: new Set(['start']), // compare_groups NOT expanded
        collapsedSubtrees: new Set()
      };
      const mockLayoutNode = {
        id: 'cont_time',
        level: 3,
        x: 0,
        y: 0,
        children: []
      };

      expect(isNodeVisible('cont_time', mockLayoutNode, state, TREE_DATA)).toBe(false);
    });

    it('should return false if ancestor is collapsed', () => {
      const state: ExpansionState = {
        expandedNodes: new Set(['start', 'cont_time']),
        collapsedSubtrees: new Set(['compare_groups']) // Parent is collapsed
      };
      const mockLayoutNode = {
        id: 'cont_time',
        level: 3,
        x: 0,
        y: 0,
        children: []
      };

      expect(isNodeVisible('cont_time', mockLayoutNode, state, TREE_DATA)).toBe(false);
    });

    it('should return true for deep nesting when all ancestors are expanded', () => {
      const state: ExpansionState = {
        expandedNodes: new Set(['start', 'compare_groups', 'cont_time']),
        collapsedSubtrees: new Set()
      };
      // Get actual deep node from TREE_DATA
      const contTimeNode = TREE_DATA['cont_time'];
      if (contTimeNode?.options?.[0]) {
        const deepNodeId = contTimeNode.options[0].nextNodeId;
        const mockLayoutNode = {
          id: deepNodeId,
          level: 4,
          x: 0,
          y: 0,
          children: []
        };

        expect(isNodeVisible(deepNodeId, mockLayoutNode, state, TREE_DATA)).toBe(true);
      }
    });
  });

  describe('getVisibleNodes', () => {
    it('should return root node when nothing is expanded', () => {
      const state: ExpansionState = {
        expandedNodes: new Set(), // Nothing expanded
        collapsedSubtrees: new Set()
      };
      const mockLayout = {
        id: 'start',
        level: 1,
        x: 0,
        y: 0,
        children: [
          { id: 'compare_groups', level: 2, x: 0, y: 0, children: [] },
          { id: 'describe_explore', level: 2, x: 0, y: 0, children: [] }
        ]
      };

      const visible = getVisibleNodes(mockLayout, state, TREE_DATA);

      expect(visible.length).toBe(1);
      expect(visible[0].id).toBe('start');
    });

    it('should return root and children when root is expanded', () => {
      const state: ExpansionState = {
        expandedNodes: new Set(['start']),
        collapsedSubtrees: new Set()
      };
      const mockLayout = {
        id: 'start',
        level: 1,
        x: 0,
        y: 0,
        children: [
          { id: 'compare_groups', level: 2, x: 0, y: 0, children: [] },
          { id: 'describe_explore', level: 2, x: 0, y: 0, children: [] }
        ]
      };

      const visible = getVisibleNodes(mockLayout, state, TREE_DATA);

      expect(visible.length).toBe(3);
      expect(visible.map(n => n.id)).toContain('start');
      expect(visible.map(n => n.id)).toContain('compare_groups');
      expect(visible.map(n => n.id)).toContain('describe_explore');
    });

    it('should recursively return visible nodes in deep trees', () => {
      const state: ExpansionState = {
        expandedNodes: new Set(['start', 'compare_groups']),
        collapsedSubtrees: new Set()
      };
      const mockLayout = {
        id: 'start',
        level: 1,
        x: 0,
        y: 0,
        children: [
          {
            id: 'compare_groups',
            level: 2,
            x: 0,
            y: 0,
            children: [
              { id: 'cont_time', level: 3, x: 0, y: 0, children: [] },
              { id: 'bin_time', level: 3, x: 0, y: 0, children: [] }
            ]
          }
        ]
      };

      const visible = getVisibleNodes(mockLayout, state, TREE_DATA);

      expect(visible.length).toBeGreaterThanOrEqual(4);
      expect(visible.map(n => n.id)).toContain('start');
      expect(visible.map(n => n.id)).toContain('compare_groups');
      expect(visible.map(n => n.id)).toContain('cont_time');
      expect(visible.map(n => n.id)).toContain('bin_time');
    });

    it('should not return collapsed subtrees', () => {
      const state: ExpansionState = {
        expandedNodes: new Set(['start', 'compare_groups']),
        collapsedSubtrees: new Set(['compare_groups'])
      };
      const mockLayout = {
        id: 'start',
        level: 1,
        x: 0,
        y: 0,
        children: [
          {
            id: 'compare_groups',
            level: 2,
            x: 0,
            y: 0,
            children: [
              { id: 'cont_time', level: 3, x: 0, y: 0, children: [] }
            ]
          }
        ]
      };

      const visible = getVisibleNodes(mockLayout, state, TREE_DATA);

      expect(visible.map(n => n.id)).toContain('start');
      expect(visible.map(n => n.id)).not.toContain('compare_groups');
      expect(visible.map(n => n.id)).not.toContain('cont_time');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty tree data', () => {
      const emptyData = {};
      expect(hasChildren('any', emptyData)).toBe(false);
      expect(getAllDescendants('any', emptyData)).toEqual([]);
      expect(getAncestors('any', emptyData)).toEqual([]);
    });

    it('should handle circular references gracefully', () => {
      // Mock circular data structure
      const circularData: any = {
        node1: {
          id: 'node1',
          question: 'Node 1',
          options: [{ label: 'To Node 2', nextNodeId: 'node2' }]
        },
        node2: {
          id: 'node2',
          question: 'Node 2',
          options: [{ label: 'To Node 1', nextNodeId: 'node1' }]
        }
      };

      // Should not infinite loop
      const descendants = getAllDescendants('node1', circularData);
      expect(descendants.length).toBeLessThan(100); // Safety check
    });

    it('should handle null/undefined node IDs', () => {
      expect(hasChildren('', TREE_DATA)).toBe(false);
      expect(hasChildren(null as any, TREE_DATA)).toBe(false);
      expect(hasChildren(undefined as any, TREE_DATA)).toBe(false);
    });
  });
});

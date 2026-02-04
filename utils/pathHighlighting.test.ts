/**
 * Tests for Active Path Highlighting
 */

import { getAncestors, calculatePathToNode, getHighlightedEdges } from './pathHighlighting';
import { TREE_DATA } from '../data';

describe('Path Highlighting - getAncestors', () => {
  it('returns empty array for root node', () => {
    const ancestors = getAncestors('start', TREE_DATA);
    expect(ancestors).toEqual([]);
  });

  it('returns single ancestor for level 2 node', () => {
    const ancestors = getAncestors('compare_groups', TREE_DATA);
    expect(ancestors).toEqual(['start']);
  });

  it('returns all ancestors for deep node (level 3)', () => {
    const ancestors = getAncestors('cont_time', TREE_DATA);
    expect(ancestors).toEqual(['start', 'compare_groups']);
  });

  it('returns all ancestors for deep node (level 4)', () => {
    const ancestors = getAncestors('cont_single_groups', TREE_DATA);
    expect(ancestors).toEqual(['start', 'compare_groups', 'cont_time']);
  });

  it('returns all ancestors for very deep node (level 5)', () => {
    const ancestors = getAncestors('cont_single_2g', TREE_DATA);
    expect(ancestors).toEqual(['start', 'compare_groups', 'cont_time', 'cont_single_groups']);
  });

  it('handles missing node gracefully', () => {
    const ancestors = getAncestors('nonexistent_node', TREE_DATA);
    expect(ancestors).toEqual([]);
  });

  it('handles describe_explore path correctly', () => {
    const ancestors = getAncestors('describe_explore', TREE_DATA);
    expect(ancestors).toEqual(['start']);
  });
});

describe('Path Highlighting - calculatePathToNode', () => {
  it('returns single node for root', () => {
    const path = calculatePathToNode('start', TREE_DATA);
    expect(path).toEqual(['start']);
  });

  it('returns complete path from root to level 2 node', () => {
    const path = calculatePathToNode('compare_groups', TREE_DATA);
    expect(path).toEqual(['start', 'compare_groups']);
  });

  it('returns complete path for deep node', () => {
    const path = calculatePathToNode('cont_ttest', TREE_DATA);
    expect(path).toEqual(['start', 'compare_groups', 'cont_time', 'cont_single_groups', 'cont_single_2g', 'cont_ttest']);
  });

  it('includes current node in path', () => {
    const path = calculatePathToNode('bin_time', TREE_DATA);
    expect(path[path.length - 1]).toBe('bin_time');
  });

  it('path always starts with root', () => {
    const path = calculatePathToNode('tte_phreg', TREE_DATA);
    expect(path[0]).toBe('start');
  });

  it('handles result nodes correctly', () => {
    const path = calculatePathToNode('describe_explore', TREE_DATA);
    expect(path).toEqual(['start', 'describe_explore']);
  });

  it('returns empty array for nonexistent node', () => {
    const path = calculatePathToNode('fake_node', TREE_DATA);
    expect(path).toEqual([]);
  });
});

describe('Path Highlighting - Edge Cases', () => {
  it('handles circular reference prevention', () => {
    const circularData = {
      ...TREE_DATA,
      test_circular: {
        id: 'test_circular',
        question: 'Test',
        options: [{ label: 'Back', nextNodeId: 'test_circular' }]
      }
    };

    const ancestors = getAncestors('test_circular', circularData);
    expect(ancestors).toBeDefined();
    expect(ancestors.length).toBeLessThan(100);
  });

  it('handles multiple paths to same node (uses first found)', () => {
    const path = calculatePathToNode('cont_ttest', TREE_DATA);
    expect(Array.isArray(path)).toBe(true);
    expect(path.length).toBeGreaterThan(0);
  });

  it('handles null/undefined tree data', () => {
    const ancestors = getAncestors('start', {} as any);
    expect(ancestors).toEqual([]);
  });
});

describe('Path Highlighting - getHighlightedEdges', () => {
  it('returns edges connecting nodes in a multi-node path', () => {
    const path = ['start', 'compare_groups', 'cont_time'];
    const edges = getHighlightedEdges(path);

    expect(edges.size).toBe(2);
    expect(edges.has('edge-node-start-node-compare_groups')).toBe(true);
    expect(edges.has('edge-node-compare_groups-node-cont_time')).toBe(true);
  });

  it('returns empty set for single node path (no edges)', () => {
    const path = ['start'];
    const edges = getHighlightedEdges(path);

    expect(edges.size).toBe(0);
  });

  it('returns empty set for empty path', () => {
    const path: string[] = [];
    const edges = getHighlightedEdges(path);

    expect(edges.size).toBe(0);
  });

  it('handles deep path with multiple edges', () => {
    const path = ['start', 'compare_groups', 'cont_time', 'cont_single_groups', 'cont_single_2g'];
    const edges = getHighlightedEdges(path);

    expect(edges.size).toBe(4);
    expect(edges.has('edge-node-start-node-compare_groups')).toBe(true);
    expect(edges.has('edge-node-compare_groups-node-cont_time')).toBe(true);
    expect(edges.has('edge-node-cont_time-node-cont_single_groups')).toBe(true);
    expect(edges.has('edge-node-cont_single_groups-node-cont_single_2g')).toBe(true);
  });

  it('returns edges for two-node path', () => {
    const path = ['start', 'describe_explore'];
    const edges = getHighlightedEdges(path);

    expect(edges.size).toBe(1);
    expect(edges.has('edge-node-start-node-describe_explore')).toBe(true);
  });
});

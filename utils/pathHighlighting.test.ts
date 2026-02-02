/**
 * Tests for Active Path Highlighting (Phase 7)
 *
 * Tests path calculation and highlighting behavior
 */

import { getAncestors, calculatePathToNode } from './pathHighlighting';
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
    // Ensure no infinite loops if data structure has cycles
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
    expect(ancestors.length).toBeLessThan(100); // Should terminate, not infinite loop
  });

  it('handles multiple paths to same node (uses first found)', () => {
    // If a node can be reached by multiple paths, use the first found
    const path = calculatePathToNode('cont_ttest', TREE_DATA);
    expect(Array.isArray(path)).toBe(true);
    expect(path.length).toBeGreaterThan(0);
  });

  it('handles null/undefined tree data', () => {
    const ancestors = getAncestors('start', {} as any);
    expect(ancestors).toEqual([]);
  });
});

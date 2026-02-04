import { describe, it, expect } from '@jest/globals';
import {
  parseEdgeId,
  isEdgeOnHighlightedPath,
  shouldDeleteEdgeOnCollapse,
} from './edgeIdParser';

describe('parseEdgeId', () => {
  describe('standard format', () => {
    it('parses edge with -h1 segment', () => {
      const result = parseEdgeId('edge-node-start-node-categorical-h1');
      expect(result).toEqual({ parentId: 'start', childId: 'categorical' });
    });

    it('parses edge with -h2 segment', () => {
      const result = parseEdgeId('edge-node-categorical-node-two_groups-h2');
      expect(result).toEqual({ parentId: 'categorical', childId: 'two_groups' });
    });

    it('parses edge with -v segment', () => {
      const result = parseEdgeId('edge-node-two_groups-node-paired-v');
      expect(result).toEqual({ parentId: 'two_groups', childId: 'paired' });
    });
  });

  describe('with shape: prefix', () => {
    it('parses edge with shape: prefix and -h1 segment', () => {
      const result = parseEdgeId('shape:edge-node-start-node-categorical-h1');
      expect(result).toEqual({ parentId: 'start', childId: 'categorical' });
    });

    it('parses edge with shape: prefix and -v segment', () => {
      const result = parseEdgeId('shape:edge-node-paired-node-proc_ttest-v');
      expect(result).toEqual({ parentId: 'paired', childId: 'proc_ttest' });
    });
  });

  describe('node IDs with underscores', () => {
    it('parses edge with compare_groups node', () => {
      const result = parseEdgeId('edge-node-categorical-node-compare_groups-h1');
      expect(result).toEqual({ parentId: 'categorical', childId: 'compare_groups' });
    });

    it('parses edge with cont_time node', () => {
      const result = parseEdgeId('edge-node-continuous-node-cont_time-h2');
      expect(result).toEqual({ parentId: 'continuous', childId: 'cont_time' });
    });

    it('parses edge with both nodes having underscores', () => {
      const result = parseEdgeId('edge-node-compare_groups-node-two_groups-v');
      expect(result).toEqual({ parentId: 'compare_groups', childId: 'two_groups' });
    });
  });

  describe('different segments', () => {
    it('handles -h1 segment correctly', () => {
      const result = parseEdgeId('edge-node-parent-node-child-h1');
      expect(result).toEqual({ parentId: 'parent', childId: 'child' });
    });

    it('handles -h2 segment correctly', () => {
      const result = parseEdgeId('edge-node-parent-node-child-h2');
      expect(result).toEqual({ parentId: 'parent', childId: 'child' });
    });

    it('handles -v segment correctly', () => {
      const result = parseEdgeId('edge-node-parent-node-child-v');
      expect(result).toEqual({ parentId: 'parent', childId: 'child' });
    });
  });

  describe('invalid/non-edge IDs', () => {
    it('returns null for non-edge shape ID', () => {
      const result = parseEdgeId('shape:some-node-id');
      expect(result).toBeNull();
    });

    it('returns null for arrow shape', () => {
      const result = parseEdgeId('shape:arrow-123');
      expect(result).toBeNull();
    });

    it('returns null for malformed edge ID', () => {
      const result = parseEdgeId('edge-invalid-format');
      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const result = parseEdgeId('');
      expect(result).toBeNull();
    });

    it('returns null for edge without proper node markers', () => {
      const result = parseEdgeId('edge-parent-child-h1');
      expect(result).toBeNull();
    });
  });
});

describe('isEdgeOnHighlightedPath', () => {
  it('returns true when both parent and child are in highlighted path', () => {
    const highlightedPath = new Set(['start', 'categorical', 'two_groups']);
    const result = isEdgeOnHighlightedPath(
      'edge-node-start-node-categorical-h1',
      highlightedPath
    );
    expect(result).toBe(true);
  });

  it('returns true for edge between two highlighted nodes with underscores', () => {
    const highlightedPath = new Set(['compare_groups', 'two_groups', 'paired']);
    const result = isEdgeOnHighlightedPath(
      'edge-node-compare_groups-node-two_groups-v',
      highlightedPath
    );
    expect(result).toBe(true);
  });

  it('returns false when only parent is in highlighted path', () => {
    const highlightedPath = new Set(['start', 'categorical']);
    const result = isEdgeOnHighlightedPath(
      'edge-node-categorical-node-two_groups-h2',
      highlightedPath
    );
    expect(result).toBe(false);
  });

  it('returns false when only child is in highlighted path', () => {
    const highlightedPath = new Set(['two_groups', 'paired']);
    const result = isEdgeOnHighlightedPath(
      'edge-node-start-node-two_groups-h1',
      highlightedPath
    );
    expect(result).toBe(false);
  });

  it('returns false when neither parent nor child is in highlighted path', () => {
    const highlightedPath = new Set(['start', 'continuous']);
    const result = isEdgeOnHighlightedPath(
      'edge-node-categorical-node-two_groups-h1',
      highlightedPath
    );
    expect(result).toBe(false);
  });

  it('returns false for empty highlighted path', () => {
    const highlightedPath = new Set<string>();
    const result = isEdgeOnHighlightedPath(
      'edge-node-start-node-categorical-h1',
      highlightedPath
    );
    expect(result).toBe(false);
  });

  it('returns false for invalid edge ID', () => {
    const highlightedPath = new Set(['start', 'categorical']);
    const result = isEdgeOnHighlightedPath(
      'invalid-shape-id',
      highlightedPath
    );
    expect(result).toBe(false);
  });

  it('handles shape: prefix correctly', () => {
    const highlightedPath = new Set(['start', 'categorical']);
    const result = isEdgeOnHighlightedPath(
      'shape:edge-node-start-node-categorical-h1',
      highlightedPath
    );
    expect(result).toBe(true);
  });
});

describe('shouldDeleteEdgeOnCollapse', () => {
  it('returns true when child is in descendant set', () => {
    const descendantSet = new Set(['two_groups', 'paired', 'proc_ttest']);
    const result = shouldDeleteEdgeOnCollapse(
      'edge-node-categorical-node-two_groups-h1',
      'categorical',
      descendantSet
    );
    expect(result).toBe(true);
  });

  it('returns true when parent equals collapsed node', () => {
    const descendantSet = new Set(['two_groups', 'paired']);
    const result = shouldDeleteEdgeOnCollapse(
      'edge-node-categorical-node-compare_groups-h1',
      'categorical',
      descendantSet
    );
    expect(result).toBe(true);
  });

  it('returns true when both conditions are met', () => {
    const descendantSet = new Set(['two_groups', 'paired']);
    const result = shouldDeleteEdgeOnCollapse(
      'edge-node-categorical-node-two_groups-h1',
      'categorical',
      descendantSet
    );
    expect(result).toBe(true);
  });

  it('returns false when neither condition is met', () => {
    const descendantSet = new Set(['paired', 'proc_ttest']);
    const result = shouldDeleteEdgeOnCollapse(
      'edge-node-start-node-categorical-h1',
      'two_groups',
      descendantSet
    );
    expect(result).toBe(false);
  });

  it('returns false for edge not connected to collapsed branch', () => {
    const descendantSet = new Set(['continuous', 'cont_time']);
    const result = shouldDeleteEdgeOnCollapse(
      'edge-node-categorical-node-two_groups-h1',
      'start',
      descendantSet
    );
    expect(result).toBe(false);
  });

  it('handles node IDs with underscores', () => {
    const descendantSet = new Set(['two_groups', 'paired', 'proc_ttest']);
    const result = shouldDeleteEdgeOnCollapse(
      'edge-node-compare_groups-node-two_groups-v',
      'compare_groups',
      descendantSet
    );
    expect(result).toBe(true);
  });

  it('returns false for invalid edge ID', () => {
    const descendantSet = new Set(['two_groups']);
    const result = shouldDeleteEdgeOnCollapse(
      'invalid-shape-id',
      'categorical',
      descendantSet
    );
    expect(result).toBe(false);
  });

  it('handles shape: prefix correctly', () => {
    const descendantSet = new Set(['two_groups', 'paired']);
    const result = shouldDeleteEdgeOnCollapse(
      'shape:edge-node-categorical-node-two_groups-h1',
      'categorical',
      descendantSet
    );
    expect(result).toBe(true);
  });
});

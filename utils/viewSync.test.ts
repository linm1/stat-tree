/**
 * Tests for Bidirectional View Sync State Management
 *
 * Tests synchronization between Interactive Flow view and Map view
 */

import {
  syncFlowToMap,
  syncMapToFlow,
  arePathsEqual,
  MapSyncResult,
  FlowSyncResult
} from './viewSync';
import { TREE_DATA } from '../data';

describe('viewSync - syncFlowToMap', () => {
  it('returns correct selectedNodeId from history (last element)', () => {
    const history = ['start', 'compare_groups', 'cont_time'];
    const result = syncFlowToMap(history, TREE_DATA);

    expect(result.selectedNodeId).toBe('cont_time');
  });

  it('returns full path from root to selected node', () => {
    const history = ['start', 'compare_groups', 'cont_time'];
    const result = syncFlowToMap(history, TREE_DATA);

    expect(result.highlightedPath).toEqual(['start', 'compare_groups', 'cont_time']);
  });

  it('handles single-node history with root node', () => {
    const history = ['start'];
    const result = syncFlowToMap(history, TREE_DATA);

    expect(result.selectedNodeId).toBe('start');
    expect(result.highlightedPath).toEqual(['start']);
  });

  it('returns empty path for invalid node in history', () => {
    const history = ['start', 'compare_groups', 'invalid_node'];
    const result = syncFlowToMap(history, TREE_DATA);

    expect(result.selectedNodeId).toBe('invalid_node');
    expect(result.highlightedPath).toEqual([]);
  });

  it('handles empty history gracefully', () => {
    const history: string[] = [];
    const result = syncFlowToMap(history, TREE_DATA);

    expect(result.selectedNodeId).toBe('');
    expect(result.highlightedPath).toEqual([]);
  });

  it('handles deep navigation path correctly', () => {
    const history = ['start', 'compare_groups', 'cont_time', 'cont_single_groups', 'cont_single_2g'];
    const result = syncFlowToMap(history, TREE_DATA);

    expect(result.selectedNodeId).toBe('cont_single_2g');
    expect(result.highlightedPath).toEqual([
      'start',
      'compare_groups',
      'cont_time',
      'cont_single_groups',
      'cont_single_2g'
    ]);
  });

  it('validates history path consistency with tree structure', () => {
    // Valid sequential path through tree
    const validHistory = ['start', 'compare_groups', 'cont_time'];
    const result = syncFlowToMap(validHistory, TREE_DATA);

    expect(result.highlightedPath).toEqual(validHistory);
  });

  it('handles history with only invalid nodes', () => {
    const history = ['fake1', 'fake2', 'fake3'];
    const result = syncFlowToMap(history, TREE_DATA);

    expect(result.selectedNodeId).toBe('fake3');
    expect(result.highlightedPath).toEqual([]);
  });
});

describe('viewSync - syncMapToFlow', () => {
  it('returns history as full path from root to selected node', () => {
    const selectedNodeId = 'cont_time';
    const result = syncMapToFlow(selectedNodeId, TREE_DATA);

    expect(result.history).toEqual(['start', 'compare_groups', 'cont_time']);
  });

  it('returns currentNodeId as the selected node', () => {
    const selectedNodeId = 'cont_time';
    const result = syncMapToFlow(selectedNodeId, TREE_DATA);

    expect(result.currentNodeId).toBe('cont_time');
  });

  it('handles root node selection with single-element history', () => {
    const selectedNodeId = 'start';
    const result = syncMapToFlow(selectedNodeId, TREE_DATA);

    expect(result.history).toEqual(['start']);
    expect(result.currentNodeId).toBe('start');
  });

  it('returns empty history for invalid nodeId', () => {
    const selectedNodeId = 'nonexistent_node';
    const result = syncMapToFlow(selectedNodeId, TREE_DATA);

    expect(result.history).toEqual([]);
    expect(result.currentNodeId).toBe('nonexistent_node');
  });

  it('handles deep node selection correctly', () => {
    const selectedNodeId = 'cont_single_2g';
    const result = syncMapToFlow(selectedNodeId, TREE_DATA);

    expect(result.history).toEqual([
      'start',
      'compare_groups',
      'cont_time',
      'cont_single_groups',
      'cont_single_2g'
    ]);
    expect(result.currentNodeId).toBe('cont_single_2g');
  });

  it('handles result node selection', () => {
    const selectedNodeId = 'describe_explore';
    const result = syncMapToFlow(selectedNodeId, TREE_DATA);

    expect(result.history).toEqual(['start', 'describe_explore']);
    expect(result.currentNodeId).toBe('describe_explore');
  });

  it('handles empty string nodeId', () => {
    const selectedNodeId = '';
    const result = syncMapToFlow(selectedNodeId, TREE_DATA);

    expect(result.history).toEqual([]);
    expect(result.currentNodeId).toBe('');
  });
});

describe('viewSync - arePathsEqual', () => {
  it('returns true for identical paths', () => {
    const path1 = ['start', 'compare_groups', 'cont_time'];
    const path2 = ['start', 'compare_groups', 'cont_time'];

    expect(arePathsEqual(path1, path2)).toBe(true);
  });

  it('returns false for different paths', () => {
    const path1 = ['start', 'compare_groups', 'cont_time'];
    const path2 = ['start', 'compare_groups', 'bin_time'];

    expect(arePathsEqual(path1, path2)).toBe(false);
  });

  it('returns false for paths with different lengths', () => {
    const path1 = ['start', 'compare_groups'];
    const path2 = ['start', 'compare_groups', 'cont_time'];

    expect(arePathsEqual(path1, path2)).toBe(false);
  });

  it('returns true for two empty arrays', () => {
    const path1: string[] = [];
    const path2: string[] = [];

    expect(arePathsEqual(path1, path2)).toBe(true);
  });

  it('returns false when one path is empty', () => {
    const path1 = ['start'];
    const path2: string[] = [];

    expect(arePathsEqual(path1, path2)).toBe(false);
  });

  it('returns false for same elements in different order', () => {
    const path1 = ['start', 'compare_groups', 'cont_time'];
    const path2 = ['cont_time', 'compare_groups', 'start'];

    expect(arePathsEqual(path1, path2)).toBe(false);
  });

  it('returns true for single-element identical paths', () => {
    const path1 = ['start'];
    const path2 = ['start'];

    expect(arePathsEqual(path1, path2)).toBe(true);
  });

  it('handles paths with special characters', () => {
    const path1 = ['node_1', 'node-2', 'node.3'];
    const path2 = ['node_1', 'node-2', 'node.3'];

    expect(arePathsEqual(path1, path2)).toBe(true);
  });
});

describe('viewSync - Edge Cases', () => {
  it('syncFlowToMap handles null/undefined data gracefully', () => {
    const history = ['start'];
    const result = syncFlowToMap(history, {} as any);

    expect(result.selectedNodeId).toBe('start');
    expect(result.highlightedPath).toEqual([]);
  });

  it('syncMapToFlow handles null/undefined data gracefully', () => {
    const result = syncMapToFlow('start', {} as any);

    expect(result.currentNodeId).toBe('start');
    expect(result.history).toEqual([]);
  });

  it('roundtrip sync maintains data integrity', () => {
    // Flow -> Map -> Flow should preserve state
    const originalHistory = ['start', 'compare_groups', 'cont_time'];

    const mapResult = syncFlowToMap(originalHistory, TREE_DATA);
    const flowResult = syncMapToFlow(mapResult.selectedNodeId, TREE_DATA);

    expect(flowResult.history).toEqual(originalHistory);
    expect(flowResult.currentNodeId).toBe('cont_time');
  });

  it('roundtrip sync handles root node', () => {
    const originalHistory = ['start'];

    const mapResult = syncFlowToMap(originalHistory, TREE_DATA);
    const flowResult = syncMapToFlow(mapResult.selectedNodeId, TREE_DATA);

    expect(flowResult.history).toEqual(originalHistory);
    expect(flowResult.currentNodeId).toBe('start');
  });
});

describe('viewSync - Integration with calculatePathToNode', () => {
  it('syncFlowToMap uses calculatePathToNode internally', () => {
    // Verify that the path calculation matches expected tree traversal
    const history = ['start', 'compare_groups', 'cont_time', 'cont_single_groups'];
    const result = syncFlowToMap(history, TREE_DATA);

    // The path should be calculated from tree structure, not just copied from history
    expect(result.highlightedPath).toEqual([
      'start',
      'compare_groups',
      'cont_time',
      'cont_single_groups'
    ]);
  });

  it('syncMapToFlow produces valid Interactive Flow history', () => {
    const selectedNodeId = 'cont_ttest';
    const result = syncMapToFlow(selectedNodeId, TREE_DATA);

    // History should represent a valid path through the decision tree
    expect(result.history.length).toBeGreaterThan(1);
    expect(result.history[0]).toBe('start');
    expect(result.history[result.history.length - 1]).toBe('cont_ttest');
  });
});

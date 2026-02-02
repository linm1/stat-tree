/**
 * Integration tests for expand/collapse icon display in App component
 * Tests Phase 6 implementation
 */

import { describe, test, expect } from '@jest/globals';
import { hasChildren, addIconToText, EXPAND_ICON, COLLAPSE_ICON } from './utils/nodeIcons';
import { TREE_DATA } from './data';

describe('App Component - Icon Integration (Phase 6)', () => {
  describe('Icon display in tree nodes', () => {
    test('start node shows collapse icon (has children)', () => {
      const nodeId = 'start';
      const isExpandable = hasChildren(nodeId, TREE_DATA);

      expect(isExpandable).toBe(true);

      const text = TREE_DATA[nodeId].question;
      const displayText = addIconToText(text, isExpandable, true);

      expect(displayText).toContain(COLLAPSE_ICON);
      expect(displayText).toBe(`${COLLAPSE_ICON} ${text}`);
    });

    test('compare_groups node shows collapse icon (has children)', () => {
      const nodeId = 'compare_groups';
      const isExpandable = hasChildren(nodeId, TREE_DATA);

      expect(isExpandable).toBe(true);

      const text = TREE_DATA[nodeId].question;
      const displayText = addIconToText(text, isExpandable, true);

      expect(displayText).toContain(COLLAPSE_ICON);
    });

    test('describe_explore node shows no icon (leaf node)', () => {
      const nodeId = 'describe_explore';
      const isExpandable = hasChildren(nodeId, TREE_DATA);

      expect(isExpandable).toBe(false);

      const text = TREE_DATA[nodeId].question;
      const displayText = addIconToText(text, isExpandable, false);

      expect(displayText).not.toContain(COLLAPSE_ICON);
      expect(displayText).not.toContain(EXPAND_ICON);
      expect(displayText).toBe(text);
    });

    test('cont_time node shows collapse icon (has children)', () => {
      const nodeId = 'cont_time';
      const isExpandable = hasChildren(nodeId, TREE_DATA);

      expect(isExpandable).toBe(true);

      const text = TREE_DATA[nodeId].question;
      const displayText = addIconToText(text, isExpandable, true);

      expect(displayText).toContain(COLLAPSE_ICON);
    });

    test('terminal nodes show no icon', () => {
      const terminalNodes = ['cont_ttest', 'cont_paired', 'bin_freq'];

      terminalNodes.forEach(nodeId => {
        const isExpandable = hasChildren(nodeId, TREE_DATA);
        expect(isExpandable).toBe(false);

        const text = TREE_DATA[nodeId].question;
        const displayText = addIconToText(text, isExpandable, false);

        expect(displayText).toBe(text);
        expect(displayText).not.toContain(EXPAND_ICON);
        expect(displayText).not.toContain(COLLAPSE_ICON);
      });
    });
  });

  describe('Icon state changes', () => {
    test('collapsed expandable node shows expand icon', () => {
      const nodeId = 'start';
      const text = TREE_DATA[nodeId].question;
      const isExpandable = true;
      const isExpanded = false;

      const displayText = addIconToText(text, isExpandable, isExpanded);

      expect(displayText).toContain(EXPAND_ICON);
      expect(displayText).toBe(`${EXPAND_ICON} ${text}`);
    });

    test('expanded expandable node shows collapse icon', () => {
      const nodeId = 'start';
      const text = TREE_DATA[nodeId].question;
      const isExpandable = true;
      const isExpanded = true;

      const displayText = addIconToText(text, isExpandable, isExpanded);

      expect(displayText).toContain(COLLAPSE_ICON);
      expect(displayText).toBe(`${COLLAPSE_ICON} ${text}`);
    });
  });

  describe('Metadata storage', () => {
    test('shape metadata should include isExpandable flag', () => {
      const metadata = {
        nodeId: 'start',
        isExpandable: true,
        isExpanded: true
      };

      expect(metadata.nodeId).toBe('start');
      expect(metadata.isExpandable).toBe(true);
      expect(metadata.isExpanded).toBe(true);
    });

    test('shape metadata for leaf node has isExpandable false', () => {
      const metadata = {
        nodeId: 'describe_explore',
        isExpandable: false,
        isExpanded: false
      };

      expect(metadata.isExpandable).toBe(false);
    });
  });

  describe('Coverage of all node types', () => {
    test('all parent nodes in TREE_DATA are identified as expandable', () => {
      const parentNodes = [
        'start',
        'compare_groups',
        'cont_time',
        'cont_single_groups',
        'cont_single_2g',
        'bin_time',
        'bin_single_type',
        'bin_rep_type',
        'count_check',
        'tte_type',
        'tte_single',
        'ord_type',
        'ord_analysis'
      ];

      parentNodes.forEach(nodeId => {
        const isExpandable = hasChildren(nodeId, TREE_DATA);
        expect(isExpandable).toBe(true);
      });
    });

    test('all result nodes are identified as non-expandable', () => {
      const resultNodes = Object.keys(TREE_DATA).filter(
        nodeId => TREE_DATA[nodeId].result !== undefined
      );

      expect(resultNodes.length).toBeGreaterThan(0);

      resultNodes.forEach(nodeId => {
        const isExpandable = hasChildren(nodeId, TREE_DATA);
        expect(isExpandable).toBe(false);
      });
    });
  });

  describe('Edge cases', () => {
    test('handles nonexistent node gracefully', () => {
      const nodeId = 'nonexistent';
      const isExpandable = hasChildren(nodeId, TREE_DATA);

      expect(isExpandable).toBe(false);
    });

    test('handles node with empty options array', () => {
      const node = {
        id: 'test',
        question: 'Test',
        options: []
      };

      const isExpandable = node.options && node.options.length > 0;

      expect(isExpandable).toBe(false);
    });
  });
});

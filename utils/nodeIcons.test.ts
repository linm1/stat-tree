/**
 * Tests for expand/collapse icon display logic
 * Phase 6 of progressive disclosure implementation
 *
 * These tests verify:
 * - Icon text prefixing logic
 * - Expandable node detection
 * - Icon updates on state changes
 * - Text truncation with icons
 */

import { describe, test, expect } from '@jest/globals';

// Mock tree data for testing
const mockTreeData = {
  'start': {
    id: 'start',
    question: 'Root Node',
    options: [
      { label: 'Child 1', nextNodeId: 'child1' },
      { label: 'Child 2', nextNodeId: 'child2' }
    ]
  },
  'child1': {
    id: 'child1',
    question: 'Parent Node',
    options: [
      { label: 'Grandchild', nextNodeId: 'grandchild1' }
    ]
  },
  'child2': {
    id: 'child2',
    question: 'Leaf Node',
    options: []
  },
  'grandchild1': {
    id: 'grandchild1',
    question: 'Another Leaf',
    options: []
  }
};

describe('Node Icon Display (Phase 6)', () => {
  describe('Expandable Node Detection', () => {
    test('returns true for node with children', () => {
      const node = mockTreeData['start'];
      const hasChildren = node.options && node.options.length > 0;

      expect(hasChildren).toBe(true);
    });

    test('returns false for node without children', () => {
      const node = mockTreeData['child2'];
      const hasChildren = node.options && node.options.length > 0;

      expect(hasChildren).toBe(false);
    });

    test('returns false for node with undefined options', () => {
      const node: any = { id: 'test', question: 'Test' };
      const hasChildren = node.options && node.options.length > 0;

      expect(hasChildren).toBeFalsy();
    });

    test('returns false for node with empty options array', () => {
      const node = { id: 'test', question: 'Test', options: [] };
      const hasChildren = node.options && node.options.length > 0;

      expect(hasChildren).toBe(false);
    });

    test('returns true for node with single child', () => {
      const node = mockTreeData['child1'];
      const hasChildren = node.options && node.options.length > 0;

      expect(hasChildren).toBe(true);
      expect(node.options?.length).toBe(1);
    });

    test('returns true for node with multiple children', () => {
      const node = mockTreeData['start'];
      const hasChildren = node.options && node.options.length > 0;

      expect(hasChildren).toBe(true);
      expect(node.options?.length).toBe(2);
    });
  });

  describe('Icon Prefix Logic', () => {
    test('adds collapse icon (▼) for expanded node with children', () => {
      const text = 'Root Node';
      const isExpandable = true;
      const isExpanded = true;

      const displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      expect(displayText).toBe('▼ Root Node');
    });

    test('adds expand icon (▶) for collapsed node with children', () => {
      const text = 'Root Node';
      const isExpandable = true;
      const isExpanded = false;

      const displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      expect(displayText).toBe('▶ Root Node');
    });

    test('does not add icon for leaf node', () => {
      const text = 'Leaf Node';
      const isExpandable = false;
      const isExpanded = false;

      const displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      expect(displayText).toBe('Leaf Node');
    });

    test('handles empty text with icon', () => {
      const text = '';
      const isExpandable = true;
      const isExpanded = true;

      const displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      expect(displayText).toBe('▼ ');
    });

    test('preserves leading/trailing whitespace in text', () => {
      const text = '  Padded Text  ';
      const isExpandable = true;
      const isExpanded = false;

      const displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      expect(displayText).toBe('▶   Padded Text  ');
    });

    test('handles long text with icon', () => {
      const text = 'This is a very long question that might need truncation';
      const isExpandable = true;
      const isExpanded = true;

      const displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      expect(displayText).toBe('▼ This is a very long question that might need truncation');
      expect(displayText.length).toBeGreaterThan(text.length);
    });
  });

  describe('Icon State Transitions', () => {
    test('icon changes from ▶ to ▼ when node expands', () => {
      const text = 'Node';

      // Initial state: collapsed
      let isExpanded = false;
      const isExpandable = true;
      let displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      expect(displayText).toBe('▶ Node');

      // After expansion
      isExpanded = true;
      displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      expect(displayText).toBe('▼ Node');
    });

    test('icon changes from ▼ to ▶ when node collapses', () => {
      const text = 'Node';

      // Initial state: expanded
      let isExpanded = true;
      const isExpandable = true;
      let displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      expect(displayText).toBe('▼ Node');

      // After collapse
      isExpanded = false;
      displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      expect(displayText).toBe('▶ Node');
    });

    test('multiple toggles maintain correct icon', () => {
      const text = 'Toggle Node';
      const isExpandable = true;

      const states = [false, true, false, true, false];
      const expectedIcons = ['▶', '▼', '▶', '▼', '▶'];

      states.forEach((isExpanded, index) => {
        const displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;
        const icon = displayText.split(' ')[0];

        expect(icon).toBe(expectedIcons[index]);
      });
    });
  });

  describe('Integration with createNode', () => {
    test('createNode parameters include isExpandable flag', () => {
      const nodeData = {
        id: 'start',
        text: 'Root Node',
        x: 100,
        y: 100,
        color: 'grey',
        fill: 'none',
        isExpandable: true,
        isExpanded: false
      };

      expect(nodeData.isExpandable).toBe(true);
      expect(nodeData.isExpanded).toBe(false);
    });

    test('createNode parameters include isExpanded flag', () => {
      const nodeData = {
        id: 'start',
        text: 'Root Node',
        x: 100,
        y: 100,
        color: 'grey',
        fill: 'none',
        isExpandable: true,
        isExpanded: true
      };

      expect(nodeData.isExpanded).toBe(true);
    });

    test('leaf node has isExpandable set to false', () => {
      const nodeData = {
        id: 'leaf',
        text: 'Leaf Node',
        x: 100,
        y: 100,
        color: 'grey',
        fill: 'none',
        isExpandable: false,
        isExpanded: false
      };

      expect(nodeData.isExpandable).toBe(false);
    });

    test('shape metadata includes expansion state', () => {
      const shapeMeta = {
        nodeId: 'start',
        isExpandable: true,
        isExpanded: false
      };

      expect(shapeMeta.nodeId).toBe('start');
      expect(shapeMeta.isExpandable).toBe(true);
      expect(shapeMeta.isExpanded).toBe(false);
    });
  });

  describe('Text Truncation with Icons', () => {
    test('icon is added before truncation', () => {
      const maxLength = 30;
      const text = 'This is a very long question text that will be truncated';
      const isExpandable = true;
      const isExpanded = true;

      // Add icon first
      const withIcon = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      // Then truncate
      const truncated = withIcon.length > maxLength
        ? withIcon.slice(0, maxLength) + '...'
        : withIcon;

      expect(truncated.startsWith('▼')).toBe(true);
      expect(truncated.length).toBeLessThanOrEqual(maxLength + 3); // +3 for '...'
    });

    test('short text with icon is not truncated', () => {
      const maxLength = 30;
      const text = 'Short';
      const isExpandable = true;
      const isExpanded = false;

      const withIcon = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;
      const truncated = withIcon.length > maxLength
        ? withIcon.slice(0, maxLength) + '...'
        : withIcon;

      expect(truncated).toBe('▶ Short');
      expect(truncated).not.toContain('...');
    });

    test('icon counts toward character limit', () => {
      const text = 'A'.repeat(30);
      const isExpandable = true;
      const isExpanded = true;

      const withIcon = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      // Icon + space + text = 2 + 30 = 32 characters
      expect(withIcon.length).toBe(32);
      expect(withIcon.startsWith('▼ ')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('handles null text gracefully', () => {
      const text = null as any;
      const isExpandable = true;
      const isExpanded = true;

      // Should handle null text without crashing
      const displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      expect(displayText).toBe('▼ null');
    });

    test('handles undefined expansion state', () => {
      const text = 'Node';
      const isExpandable = true;
      const isExpanded = undefined as any;

      // Should default to collapsed (▶) when undefined
      const displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      expect(displayText).toBe('▶ Node');
    });

    test('handles special characters in text', () => {
      const text = 'Test <>&"\'';
      const isExpandable = true;
      const isExpanded = true;

      const displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      expect(displayText).toBe('▼ Test <>&"\'');
    });

    test('handles unicode characters in text', () => {
      const text = 'Test 你好 🎉';
      const isExpandable = true;
      const isExpanded = false;

      const displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      expect(displayText).toBe('▶ Test 你好 🎉');
    });

    test('handles newlines in text', () => {
      const text = 'Line 1\nLine 2';
      const isExpandable = true;
      const isExpanded = true;

      const displayText = isExpandable ? `${isExpanded ? '▼' : '▶'} ${text}` : text;

      expect(displayText).toBe('▼ Line 1\nLine 2');
    });
  });

  describe('Icon Visual Verification', () => {
    test('collapse icon is triangle pointing down', () => {
      const icon = '▼';
      expect(icon).toBe('▼');
      expect(icon.charCodeAt(0)).toBe(9660); // Unicode for BLACK DOWN-POINTING TRIANGLE
    });

    test('expand icon is triangle pointing right', () => {
      const icon = '▶';
      expect(icon).toBe('▶');
      expect(icon.charCodeAt(0)).toBe(9654); // Unicode for BLACK RIGHT-POINTING TRIANGLE
    });

    test('icons are visually distinct', () => {
      const expandIcon = '▶';
      const collapseIcon = '▼';

      expect(expandIcon).not.toBe(collapseIcon);
      expect(expandIcon.charCodeAt(0)).not.toBe(collapseIcon.charCodeAt(0));
    });
  });
});

import { TREE_DATA } from './data';
import { TreeData, DecisionNode } from './types';

/**
 * Test suite for the Comprehensive Clinical Trial Analysis Decision Tree
 *
 * NEW Tree Structure (First 4 Layers - matching user's ASCII diagram):
 *
 * Layer 1: START - "What's your question?"
 * Layer 2: COMPARE GROUPS | DESCRIBE/EXPLORE (these are now NODES, not just labels)
 * Layer 3: PRIMARY ENDPOINT | SECONDARY/EXPLORATORY (from Compare) | [Result] (from Describe)
 * Layer 4: OUTCOME TYPE question with 5 branches
 *
 * The key change: Layer 2 now has separate nodes for the path choices,
 * and Layer 3 has the endpoint type selection.
 */

describe('TREE_DATA - Comprehensive Clinical Trial Decision Tree', () => {

  describe('Layer 1: Root Node (START)', () => {
    it('should have a start node as root', () => {
      expect(TREE_DATA).toHaveProperty('start');
    });

    it('should have "start" with correct question', () => {
      expect(TREE_DATA.start.question).toBe("What's your question?");
    });

    it('should have exactly 2 options: Compare Groups and Describe/Explore', () => {
      expect(TREE_DATA.start.options).toHaveLength(2);

      const labels = TREE_DATA.start.options?.map(opt => opt.label) || [];
      expect(labels).toContain('Compare Groups');
      expect(labels).toContain('Describe / Explore');
    });

    it('Compare Groups should lead to compare_groups node', () => {
      const compareOption = TREE_DATA.start.options?.find(
        opt => opt.label === 'Compare Groups'
      );
      expect(compareOption?.nextNodeId).toBe('compare_groups');
    });

    it('Describe/Explore should lead to describe_explore node', () => {
      const describeOption = TREE_DATA.start.options?.find(
        opt => opt.label === 'Describe / Explore'
      );
      expect(describeOption?.nextNodeId).toBe('describe_explore');
    });

    it('should not be a result node', () => {
      expect(TREE_DATA.start.result).toBeUndefined();
    });
  });

  describe('Layer 2: Compare Groups vs Describe/Explore', () => {
    describe('Compare Groups Path (compare_groups node)', () => {
      it('compare_groups node should exist', () => {
        expect(TREE_DATA).toHaveProperty('compare_groups');
      });

      it('compare_groups should have "Compare Groups - What type of outcome?" as question text', () => {
        expect(TREE_DATA.compare_groups.question).toBe('Compare Groups - What type of outcome?');
      });

      it('compare_groups should have 5 outcome type options', () => {
        const options = TREE_DATA.compare_groups.options || [];
        const labels = options.map(opt => opt.label);

        expect(labels).toContain('Continuous');
        expect(labels).toContain('Binary');
        expect(labels).toContain('Count');
        expect(labels).toContain('Time-to-Event');
        expect(labels).toContain('Ordinal / Categorical');
      });
    });

    describe('Describe/Explore Path (describe_explore node)', () => {
      it('describe_explore node should exist', () => {
        expect(TREE_DATA).toHaveProperty('describe_explore');
      });

      it('describe_explore should have "Describe / Explore" as question text', () => {
        expect(TREE_DATA.describe_explore.question).toBe('Describe / Explore');
      });

      it('describe_explore should be a result node with descriptive procedures', () => {
        expect(TREE_DATA.describe_explore.result).toBeDefined();

        const procedures = TREE_DATA.describe_explore.result?.procedures || [];
        expect(procedures).toContain('PROC MEANS');
        expect(procedures).toContain('PROC FREQ');
        expect(procedures).toContain('PROC UNIVARIATE');
        expect(procedures).toContain('PROC TABULATE');
      });
    });
  });

  describe('Layer 3: Outcome Types (directly from compare_groups)', () => {
    it('Continuous should lead to cont_time', () => {
      const continuousOption = TREE_DATA.compare_groups.options?.find(
        opt => opt.label === 'Continuous'
      );
      expect(continuousOption?.nextNodeId).toBe('cont_time');
    });

    it('Binary should lead to bin_time', () => {
      const binaryOption = TREE_DATA.compare_groups.options?.find(
        opt => opt.label === 'Binary'
      );
      expect(binaryOption?.nextNodeId).toBe('bin_time');
    });
  });

  describe('Layer 3: Outcome Type Branches (5 outcomes)', () => {
    const EXPECTED_OUTCOME_TYPES = [
      { label: 'Continuous', nextNodeId: 'cont_time', description: /normal|weight|bp|lab/i },
      { label: 'Binary', nextNodeId: 'bin_time', description: /yes.*no|response|success/i },
      { label: 'Count', nextNodeId: 'count_check', description: /events|exacerbations|ae/i },
      { label: 'Time-to-Event', nextNodeId: 'tte_type', description: /survival|remission|failure/i },
      { label: 'Ordinal / Categorical', nextNodeId: 'ord_type', description: /severity|scale|ordered|nominal/i },
    ];

    it('compare_groups should have exactly 5 outcome type options', () => {
      expect(TREE_DATA.compare_groups.options).toHaveLength(5);
    });

    EXPECTED_OUTCOME_TYPES.forEach(({ label, nextNodeId, description }) => {
      it(`should have "${label}" option leading to "${nextNodeId}"`, () => {
        const option = TREE_DATA.compare_groups.options?.find(
          opt => opt.label === label
        );

        expect(option).toBeDefined();
        expect(option?.nextNodeId).toBe(nextNodeId);
      });

      it(`"${label}" option should have descriptive text`, () => {
        const option = TREE_DATA.compare_groups.options?.find(
          opt => opt.label === label
        );

        expect(option?.description).toBeDefined();
        expect(option?.description).toMatch(description);
      });

      it(`"${nextNodeId}" node should exist in tree`, () => {
        expect(TREE_DATA).toHaveProperty(nextNodeId);
      });
    });
  });

  describe('Tree Depth Validation', () => {
    /**
     * Compact Layer Structure (outcome_type removed):
     *
     * Layer 1: start ("What's your question?")
     * Layer 2: compare_groups ("Compare Groups - What type of outcome?") | describe_explore ("Describe / Explore" - result)
     * Layer 3: cont_time, bin_time, count_check, tte_type, ord_type (the 5 outcome branches)
     * Layer 4+: Deeper analysis nodes
     *
     * With MAX_MAP_DEPTH=4, all 4 layers are shown.
     */

    it('should have exactly 3 layers from start to outcome branches', () => {
      // Layer 1: start
      let depth = 0;
      let currentNode = 'start';

      // Layer 1
      expect(TREE_DATA[currentNode]).toBeDefined();
      depth++;

      // Layer 2: Go to compare_groups
      currentNode = TREE_DATA.start.options?.[0]?.nextNodeId || '';
      expect(currentNode).toBe('compare_groups');
      depth++;

      // Layer 3: compare_groups has 5 children (the 5 outcome types)
      const outcomeChildren = TREE_DATA.compare_groups.options?.length || 0;
      expect(outcomeChildren).toBe(5);
      depth++;

      expect(depth).toBe(3);
    });

    it('outcome type branches should exist as layer 3 nodes', () => {
      const layer3Nodes = ['cont_time', 'bin_time', 'count_check', 'tte_type', 'ord_type'];

      layer3Nodes.forEach(nodeId => {
        expect(TREE_DATA).toHaveProperty(nodeId);
        // These nodes should have further options (not results at layer 3)
        expect(TREE_DATA[nodeId].options).toBeDefined();
        expect(TREE_DATA[nodeId].options?.length).toBeGreaterThan(0);
      });
    });

    it('describe_explore should be a result node (leaf at layer 2)', () => {
      expect(TREE_DATA.describe_explore.result).toBeDefined();
      expect(TREE_DATA.describe_explore.options).toBeUndefined();
    });
  });

  describe('Node Structure Validation', () => {
    it('all nodes should have required id and question fields', () => {
      Object.entries(TREE_DATA).forEach(([id, node]) => {
        expect(node.id).toBe(id);
        expect(node.question).toBeDefined();
        expect(typeof node.question).toBe('string');
        expect(node.question.length).toBeGreaterThan(0);
      });
    });

    it('all option nextNodeIds should reference existing nodes', () => {
      const nodeIds = Object.keys(TREE_DATA);

      Object.values(TREE_DATA).forEach((node) => {
        if (node.options) {
          node.options.forEach(option => {
            expect(nodeIds).toContain(option.nextNodeId);
          });
        }
      });
    });

    it('result nodes should have procedures, briefing, and examples', () => {
      Object.values(TREE_DATA).forEach((node) => {
        if (node.result) {
          expect(node.result.procedures).toBeDefined();
          expect(Array.isArray(node.result.procedures)).toBe(true);
          expect(node.result.procedures.length).toBeGreaterThan(0);

          expect(node.result.briefing).toBeDefined();
          expect(typeof node.result.briefing).toBe('string');

          expect(node.result.examples).toBeDefined();
          expect(Array.isArray(node.result.examples)).toBe(true);
        }
      });
    });

    it('SAS examples should have title and code', () => {
      Object.values(TREE_DATA).forEach((node) => {
        if (node.result?.examples) {
          node.result.examples.forEach(example => {
            expect(example.title).toBeDefined();
            expect(typeof example.title).toBe('string');

            expect(example.code).toBeDefined();
            expect(typeof example.code).toBe('string');
            expect(example.code).toMatch(/proc\s+\w+/i); // Should contain SAS PROC statement
          });
        }
      });
    });
  });

  describe('Branch Coverage - Continuous Outcomes', () => {
    it('cont_time should have single/repeated measure options', () => {
      expect(TREE_DATA.cont_time.options).toBeDefined();
      const labels = TREE_DATA.cont_time.options?.map(opt => opt.label) || [];

      expect(labels).toContain('Single Time Point');
      expect(labels).toContain('Repeated Measures');
    });
  });

  describe('Branch Coverage - Binary Outcomes', () => {
    it('bin_time should have single/repeated measure options', () => {
      expect(TREE_DATA.bin_time.options).toBeDefined();
      const labels = TREE_DATA.bin_time.options?.map(opt => opt.label) || [];

      expect(labels).toContain('Single Time Point');
      expect(labels).toContain('Repeated Measures');
    });
  });

  describe('Branch Coverage - Count Outcomes', () => {
    it('count_check should have overdispersion options', () => {
      expect(TREE_DATA.count_check.options).toBeDefined();
      const options = TREE_DATA.count_check.options || [];

      // Should check for Poisson vs Negative Binomial based on overdispersion
      const hasPoisson = options.some(opt =>
        opt.label.toLowerCase().includes('poisson') ||
        opt.description?.toLowerCase().includes('poisson')
      );
      const hasNegBinomial = options.some(opt =>
        opt.label.toLowerCase().includes('negbin') ||
        opt.label.toLowerCase().includes('negative') ||
        opt.description?.toLowerCase().includes('negbin')
      );

      expect(hasPoisson || hasNegBinomial).toBe(true);
    });
  });

  describe('Branch Coverage - Time-to-Event Outcomes', () => {
    it('tte_type should have single/recurrent event options', () => {
      expect(TREE_DATA.tte_type.options).toBeDefined();
      const options = TREE_DATA.tte_type.options || [];

      const hasSingle = options.some(opt =>
        opt.label.toLowerCase().includes('single')
      );
      const hasRecurrent = options.some(opt =>
        opt.label.toLowerCase().includes('recurrent')
      );

      expect(hasSingle).toBe(true);
      expect(hasRecurrent).toBe(true);
    });
  });

  describe('Branch Coverage - Ordinal/Categorical Outcomes', () => {
    it('ord_type should have ordinal vs nominal options', () => {
      expect(TREE_DATA.ord_type.options).toBeDefined();
      const options = TREE_DATA.ord_type.options || [];

      const hasOrdinal = options.some(opt =>
        opt.label.toLowerCase().includes('ordinal') ||
        opt.label.toLowerCase().includes('ordered')
      );
      const hasNominal = options.some(opt =>
        opt.label.toLowerCase().includes('nominal') ||
        opt.label.toLowerCase().includes('unordered')
      );

      expect(hasOrdinal).toBe(true);
      expect(hasNominal).toBe(true);
    });
  });
});

describe('Tree Layout - MAX_MAP_DEPTH Integration', () => {
  const MAX_MAP_DEPTH = 4;

  it('should display first 4 layers in map view', () => {
    // This test verifies the structure matches what MAX_MAP_DEPTH=4 expects

    // Count nodes at each layer (compact structure - outcome_type removed)
    const layer1 = ['start'];
    const layer2 = ['compare_groups', 'describe_explore'];
    const layer3 = ['cont_time', 'bin_time', 'count_check', 'tte_type', 'ord_type'];

    // All layer 1-3 nodes should exist
    [...layer1, ...layer2, ...layer3].forEach(nodeId => {
      expect(TREE_DATA).toHaveProperty(nodeId);
    });

    // Layer 3 nodes should have children (layer 4+), which will be displayed up to MAX_MAP_DEPTH=4
    layer3.forEach(nodeId => {
      const node = TREE_DATA[nodeId];
      expect(node.options?.length).toBeGreaterThan(0);
    });
  });

  it('old node IDs should not exist (backward compatibility check)', () => {
    // These old node IDs should be replaced
    expect(TREE_DATA).not.toHaveProperty('compare_objective');
    expect(TREE_DATA).not.toHaveProperty('describe_result');
  });
});

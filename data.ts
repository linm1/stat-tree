
import { TreeData } from './types';

export const TREE_DATA: TreeData = {
  // ═══════════════════════════════════════════════════════════════════
  // LAYER 1: START
  // ═══════════════════════════════════════════════════════════════════
  start: {
    id: 'start',
    question: "What's the analysis?",
    description: "Define the main objective of your statistical analysis.",
    options: [
      { label: "Compare Groups", description: "Hypothesis testing between different treatment arms or cohorts.", nextNodeId: 'compare_groups' },
      { label: "Describe / Explore", description: "Summary statistics without formal hypothesis testing.", nextNodeId: 'describe_explore' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // LAYER 2: COMPARE GROUPS vs DESCRIBE/EXPLORE
  // ═══════════════════════════════════════════════════════════════════
  compare_groups: {
    id: 'compare_groups',
    question: "Compare Groups",
    description: "Hypothesis testing between treatment arms. Select your outcome type.",
    options: [
      { label: "Continuous", description: "Normal or near-normal data (Weight, BP, Lab Values).", nextNodeId: 'cont_time' },
      { label: "Binary", description: "Yes/No, Response/Non-response, Success/Failure.", nextNodeId: 'bin_time' },
      { label: "Count", description: "# of events, Exacerbations, AEs.", nextNodeId: 'count_check' },
      { label: "Time-to-Event", description: "Survival, Time to Remission, Time to Failure.", nextNodeId: 'tte_type' },
      { label: "Ordinal / Categorical", description: "Severity scales, multi-level ordered or nominal data.", nextNodeId: 'ord_type' }
    ]
  },
  describe_explore: {
    id: 'describe_explore',
    question: "Describe / Explore",
    description: "Summary statistics without formal hypothesis testing.",
    result: {
      procedures: ['PROC MEANS', 'PROC FREQ', 'PROC UNIVARIATE', 'PROC TABULATE'],
      briefing: "Use these procedures for initial data exploration, identifying distributions, and generating summary tables for baseline characteristics.",
      examples: [
        {
          title: "Standard Descriptive Statistics",
          code: `proc means data=trial n mean std min max;
    class treatment;
    var age weight bmi;
run;`,
          description: "Summary of continuous variables by group."
        },
        {
          title: "Frequency Tables",
          code: `proc freq data=trial;
    tables gender race ethnicity / nocum;
run;`,
          description: "Frequency distribution of categorical variables."
        }
      ]
    }
  },

  // --- CONTINUOUS BRANCH ---
  cont_time: {
    id: 'cont_time',
    question: "cross-sectional or longitudinal?",
    options: [
      { label: "Single Time Point", description: "Cross-sectional analysis at a specific visit.", nextNodeId: 'cont_single_groups' },
      { label: "Repeated Measures", description: "Longitudinal data across multiple visits.", nextNodeId: 'cont_repeated_data' }
    ]
  },
  cont_single_groups: {
    id: 'cont_single_groups',
    question: "# of groups?",
    options: [
      { label: "2 Groups", nextNodeId: 'cont_single_2g' },
      { label: "3+ Groups", nextNodeId: 'cont_single_3g' },
      { label: "With Covariates (ANCOVA)", nextNodeId: 'cont_ancova' }
    ]
  },
  cont_single_2g: {
    id: 'cont_single_2g',
    question: "paired or unpaired?",
    options: [
      { label: "Unpaired (Independent)", nextNodeId: 'cont_ttest' },
      { label: "Paired (Related)", nextNodeId: 'cont_paired' },
      { label: "Non-Normal Data", nextNodeId: 'cont_nonnorm_2g' }
    ]
  },
  cont_ttest: {
    id: 'cont_ttest',
    question: "Simple comparison (2 groups, unpaired)",
    result: {
      procedures: ['PROC TTEST'],
      briefing: "Used for comparing means of two independent groups (e.g., Drug vs Placebo in parallel groups).",
      examples: [
        {
          title: "Two-sample t-test",
          code: `proc ttest data=trial plots=all;
    class treatment;
    var change_from_baseline;
run;`
        }
      ]
    }
  },
  cont_paired: {
    id: 'cont_paired',
    question: "Paired comparison (2 groups, paired)",
    result: {
      procedures: ['PROC TTEST (paired)'],
      briefing: "Used for pre vs post treatment comparisons in the same subject.",
      examples: [
        {
          title: "Paired t-test",
          code: `proc ttest data=trial plots=all;
    paired baseline*week12;
run;`
        }
      ]
    }
  },
  cont_single_3g: {
    id: 'cont_single_3g',
    question: "One-way ANOVA (3+ groups)",
    result: {
      procedures: ['PROC GLM'],
      briefing: "Standard Analysis of Variance for comparing means across multiple dose levels or categories.",
      examples: [
        {
          title: "One-way ANOVA",
          code: `proc glm data=trial;
    class dose;
    model outcome = dose;
    means dose / tukey cldiff;
run;`
        }
      ]
    }
  },
  cont_ancova: {
    id: 'cont_ancova',
    question: "ANCOVA (Adjustment for baseline)",
    result: {
      procedures: ['PROC GLM'],
      briefing: "Standard approach for clinical trials to adjust the treatment effect for baseline imbalances.",
      examples: [
        {
          title: "ANCOVA",
          code: `proc glm data=trial;
    class treatment center;
    model change = treatment center baseline / solution ss3;
    lsmeans treatment / pdiff adjust=dunnett('Placebo');
run;`
        }
      ]
    }
  },
  cont_nonnorm_2g: {
    id: 'cont_nonnorm_2g',
    question: "Non-parametric (2 groups)",
    result: {
      procedures: ['PROC NPAR1WAY'],
      briefing: "Used when normality assumptions are violated (e.g., skewed lab values).",
      examples: [
        {
          title: "Wilcoxon Rank-Sum",
          code: `proc npar1way data=trial wilcoxon;
    class treatment;
    var outcome;
run;`
        }
      ]
    }
  },
  cont_repeated_data: {
    id: 'cont_repeated_data',
    question: "no missing values?",
    options: [
      { label: "No Missing", nextNodeId: 'cont_repeated_glm' },
      { label: "Missing Data / Unbalanced", nextNodeId: 'cont_repeated_mixed' }
    ]
  },
  cont_repeated_glm: {
    id: 'cont_repeated_glm',
    question: "Balanced Repeated Measures",
    result: {
      procedures: ['PROC GLM (REPEATED)'],
      briefing: "Classic approach for repeated measures, but requires no missing data across visits.",
      examples: [
        {
          title: "GLM Repeated",
          code: `proc glm data=longitudinal;
    class patient treatment;
    model outcome_v1 outcome_v2 outcome_v3 = treatment;
    repeated visit 3 / summary;
run;`
        }
      ]
    }
  },
  cont_repeated_mixed: {
    id: 'cont_repeated_mixed',
    question: "MMRM / Linear Mixed Models (Recommended)",
    result: {
      procedures: ['PROC MIXED'],
      briefing: "Handles missing data and flexible correlation structures (UN, AR(1)). The gold standard for longitudinal clinical data.",
      examples: [
        {
          title: "Linear Mixed Model (MMRM)",
          code: `proc mixed data=longitudinal;
    class patient treatment visit center;
    model outcome = treatment visit treatment*visit baseline center 
                    / solution ddfm=kr;
    repeated visit / subject=patient type=un;
    lsmeans treatment*visit / slice=visit diff;
run;`
        },
        {
          title: "AR(1) Correlation",
          code: `proc mixed data=longitudinal;
    class patient treatment visit;
    model outcome = treatment visit treatment*visit baseline / solution;
    repeated visit / subject=patient type=ar(1);
run;`
        }
      ]
    }
  },
  // --- BINARY BRANCH ---
  bin_time: {
    id: 'bin_time',
    question: "single timepoint or repeated measures?",
    options: [
      { label: "Single Time Point", nextNodeId: 'bin_single_type' },
      { label: "Repeated Measures", nextNodeId: 'bin_rep_type' }
    ]
  },
  bin_single_type: {
    id: 'bin_single_type',
    question: "Select analysis complexity",
    options: [
      { label: "Simple 2x2 Table", nextNodeId: 'bin_freq' },
      { label: "Adjusted Regression", nextNodeId: 'bin_logistic' }
    ]
  },
  bin_freq: {
    id: 'bin_freq',
    question: "Contingency Table Analysis",
    result: {
      procedures: ['PROC FREQ'],
      briefing: "For comparing proportions without covariate adjustment.",
      examples: [
        {
          title: "Chi-square / Fisher's Exact",
          code: `proc freq data=trial;
    tables treatment*response / chisq riskdiff relrisk exact;
run;`
        },
        {
          title: "Stratified (CMH)",
          code: `proc freq data=trial;
    tables center*treatment*response / cmh;
run;`
        }
      ]
    }
  },
  bin_logistic: {
    id: 'bin_logistic',
    question: "Logistic Reg / Risk Models",
    result: {
      procedures: ['PROC LOGISTIC', 'PROC GENMOD'],
      briefing: "Used for adjusting the odds ratio or risk difference for multiple covariates.",
      examples: [
        {
          title: "Logistic Regression (Adjusted OR)",
          code: `proc logistic data=trial descending;
    class treatment(ref='Placebo') center / param=ref;
    model response = treatment center age baseline_score;
    oddsratio treatment / at(center=all);
run;`
        },
        {
          title: "Risk Difference (Adjusted)",
          code: `proc genmod data=trial descending;
    class treatment(ref='Placebo') center;
    model response = treatment center age baseline_score / dist=binomial link=identity;
    estimate 'Treatment RD' treatment 1 -1;
run;`
        }
      ]
    }
  },
  bin_rep_type: {
    id: 'bin_rep_type',
    question: "What's your inference?",
    options: [
      { label: "Population-Average (Marginal)", nextNodeId: 'bin_gee' },
      { label: "Subject-Specific (Conditional)", nextNodeId: 'bin_glmm' }
    ]
  },
  bin_gee: {
    id: 'bin_gee',
    question: "GEE (Generalized Estimating Equations)",
    result: {
      procedures: ['PROC GENMOD'],
      briefing: "Used for marginal effects, robust to misspecification of correlation structure.",
      examples: [
        {
          title: "GEE for Binary Outcomes",
          code: `proc genmod data=longitudinal descending;
    class patient treatment visit center;
    model response = treatment visit treatment*visit center baseline 
                     / dist=binomial link=logit type3;
    repeated subject=patient / type=exch corrw;
    lsmeans treatment*visit / ilink diff;
run;`
        }
      ]
    }
  },
  bin_glmm: {
    id: 'bin_glmm',
    question: "GLMM (Generalized Linear Mixed Models)",
    result: {
      procedures: ['PROC GLIMMIX'],
      briefing: "Subject-specific effects using random intercepts/slopes.",
      examples: [
        {
          title: "GLMM Subject-Specific",
          code: `proc glimmix data=longitudinal method=laplace;
    class patient treatment visit center;
    model response(event='1') = treatment visit treatment*visit center baseline 
                                / dist=binary link=logit solution;
    random intercept / subject=patient;
run;`
        }
      ]
    }
  },
  // --- COUNT BRANCH ---
  count_check: {
    id: 'count_check',
    question: "Check for Overdispersion",
    options: [
      { label: "Variance ≈ Mean", nextNodeId: 'count_poisson' },
      { label: "Variance >> Mean", nextNodeId: 'count_nb' },
      { label: "Repeated Counts", nextNodeId: 'count_rep' }
    ]
  },
  count_poisson: {
    id: 'count_poisson',
    question: "Poisson Regression",
    result: {
      procedures: ['PROC GENMOD'],
      briefing: "Appropriate for rare events where mean equals variance.",
      examples: [
        {
          title: "Poisson Model",
          code: `proc genmod data=safety;
    class treatment center;
    model ae_count = treatment center age 
                     / dist=poisson link=log offset=log_exposure;
    estimate 'Treatment Rate Ratio' treatment 1 -1 / exp;
run;`
        }
      ]
    }
  },
  count_nb: {
    id: 'count_nb',
    question: "Negative Binomial Reg",
    result: {
      procedures: ['PROC GENMOD'],
      briefing: "The standard for AE counts or exacerbations where overdispersion is present.",
      examples: [
        {
          title: "Negative Binomial",
          code: `proc genmod data=safety;
    class treatment center;
    model ae_count = treatment center age 
                     / dist=negbin link=log offset=log_exposure;
run;`
        }
      ]
    }
  },
  count_rep: {
    id: 'count_rep',
    question: "Repeated Counts (GEE)",
    result: {
      procedures: ['PROC GENMOD (REPEATED)'],
      briefing: "Handles correlated count data over time.",
      examples: [
        {
          title: "Repeated Counts (GEE)",
          code: `proc genmod data=longitudinal;
    class patient treatment month;
    model exacerbations = treatment month season baseline_fev1 
                          / dist=negbin link=log;
    repeated subject=patient / type=exch;
run;`
        }
      ]
    }
  },
  // --- TTE BRANCH ---
  tte_type: {
    id: 'tte_type',
    question: "Type of time-to-event?",
    options: [
      { label: "Single Event", nextNodeId: 'tte_single' },
      { label: "Recurrent Events", nextNodeId: 'tte_recurrent' }
    ]
  },
  tte_single: {
    id: 'tte_single',
    question: "Unadjusted or Adjusted Analysis?",
    options: [
      { label: "Compare Curves (Unadjusted)", nextNodeId: 'tte_lifetest' },
      { label: "Adjusted Hazard Ratio (Cox)", nextNodeId: 'tte_phreg' }
    ]
  },
  tte_lifetest: {
    id: 'tte_lifetest',
    question: "Kaplan-Meier & Log-rank",
    result: {
      procedures: ['PROC LIFETEST'],
      briefing: "Non-parametric estimation of survival curves and group comparisons.",
      examples: [
        {
          title: "Survival Analysis",
          code: `proc lifetest data=oncology plots=survival(atrisk=0 to 60 by 12);
    time os_months*death(0);
    strata treatment;
run;`
        }
      ]
    }
  },
  tte_phreg: {
    id: 'tte_phreg',
    question: "Cox Proportional Hazards",
    result: {
      procedures: ['PROC PHREG'],
      briefing: "Semi-parametric model for estimating hazard ratios adjusted for covariates.",
      examples: [
        {
          title: "Cox PH Model",
          code: `proc phreg data=oncology plots(overlay)=survival;
    class treatment(ref='Placebo') stage(ref='I') / param=ref;
    model os_months*death(0) = treatment stage age ps;
    hazardratio treatment / diff=ref;
run;`
        }
      ]
    }
  },
  tte_recurrent: {
    id: 'tte_recurrent',
    question: "Recurrent Events Analysis",
    result: {
      procedures: ['PROC PHREG', 'PROC GENMOD'],
      briefing: "Analysis of multiple events per subject (e.g., repeated infections).",
      examples: [
        {
          title: "Counting Process Approach",
          code: `proc phreg data=safety;
    class patient treatment;
    model (start, stop)*ae_flag(0) = treatment age / rl;
    strata patient;
run;`
        }
      ]
    }
  },
  // --- ORDINAL BRANCH ---
  ord_type: {
    id: 'ord_type',
    question: "categorical data or nominal?",
    options: [
      { label: "Ordinal", nextNodeId: 'ord_analysis' },
      { label: "Nominal", nextNodeId: 'ord_nominal' }
    ]
  },
  ord_analysis: {
    id: 'ord_analysis',
    question: "Select ordinal analysis level",
    options: [
      { label: "Simple 2-Group Comparison", nextNodeId: 'ord_npar' },
      { label: "Adjusted Regression", nextNodeId: 'ord_logistic' }
    ]
  },
  ord_npar: {
    id: 'ord_npar',
    question: "Wilcoxon Rank-Sum (Ordinal)",
    result: {
      procedures: ['PROC NPAR1WAY'],
      briefing: "Simple non-parametric comparison for ordered scores like pain scales.",
      examples: [
        {
          title: "Wilcoxon Rank-Sum",
          code: `proc npar1way data=trial wilcoxon;
    class treatment;
    var severity_score;
run;`
        }
      ]
    }
  },
  ord_logistic: {
    id: 'ord_logistic',
    question: "Proportional Odds Model",
    result: {
      procedures: ['PROC LOGISTIC'],
      briefing: "Cumulative logit model for ordinal data adjusted for covariates.",
      examples: [
        {
          title: "Proportional Odds Model",
          code: `proc logistic data=trial;
    class treatment(ref='Placebo') center / param=ref;
    model severity(order=formatted) = treatment center age baseline / link=clogit;
run;`
        }
      ]
    }
  },
  ord_nominal: {
    id: 'ord_nominal',
    question: "Generalized Logit (Nominal)",
    result: {
      procedures: ['PROC LOGISTIC'],
      briefing: "Used when categories have no inherent order (e.g., blood types).",
      examples: [
        {
          title: "Nominal Logistic Regression",
          code: `proc logistic data=trial;
    class treatment response_type / param=ref ref=first;
    model response_type = treatment age baseline;
run;`
        }
      ]
    }
  }
};

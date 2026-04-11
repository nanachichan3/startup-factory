export enum StartupStage {
  Ideation = 'Ideation',
  Validation = 'Validation',
  Prototype = 'Prototype',
  MVP = 'MVP',
  Growth = 'Growth',
  Scale = 'Scale',
  Optimize = 'Optimize',
  Exit = 'Exit',
}

export interface StageRequirements {
  goals: string[];
  artifacts: string[];
  successMetrics: string[];
  nextStageTrigger: string;
}

export interface StartupLifecycle {
  projectId: string;
  currentStage: StartupStage;
  history: {
    stage: StartupStage;
    completedAt: Date;
    artifactsProduced: string[];
  }[];
}

export const LIFECYCLE_SCHEMA: Record<StartupStage, StageRequirements> = {
  [StartupStage.Ideation]: {
    goals: [
      'Define problem statement',
      'Identify target audience',
      'Draft initial value proposition',
    ],
    artifacts: [
      'Problem Hypothesis Document',
      'Target User Persona',
    ],
    successMetrics: [
      'Problem clearly articulated',
      'At least 3 user archetypes defined',
    ],
    nextStageTrigger: 'Problem-solution fit hypothesis signed off by CEO',
  },
  [StartupStage.Validation]: {
    goals: [
      'Conduct 10+ customer interviews',
      'Analyze at least 3 competitors',
      'Validate willingness to pay',
    ],
    artifacts: [
      'Validation Report',
      'Competitor Analysis Matrix',
      'Refined User Personas',
    ],
    successMetrics: [
      '>70% of interviewed users confirm problem urgency',
      'Positive willingness to pay signal',
    ],
    nextStageTrigger: 'Market demand validated with evidence',
  },
  [StartupStage.Prototype]: {
    goals: [
      'Build core functionality prototype',
      'Test usability with 5 target users',
      'Validate technical feasibility',
    ],
    artifacts: [
      'Lo-fi Prototype',
      'User Flow Map',
      'Technical Feasibility Report',
    ],
    successMetrics: [
      'Core loop proven functional in prototype',
      'Usability score >70%',
    ],
    nextStageTrigger: 'Prototype validated by target users',
  },
  [StartupStage.MVP]: {
    goals: [
      'Launch to 20+ early adopters',
      'Establish feedback loop',
      'Iterate based on real usage',
    ],
    artifacts: [
      'Production MVP',
      'Feedback Loop System',
      'Learning Document',
    ],
    successMetrics: [
      'Retention rate >40% at 2 weeks',
      'NPS >30',
    ],
    nextStageTrigger: 'Product-Market Fit (PMF) signals confirmed',
  },
  [StartupStage.Growth]: {
    goals: [
      'Scale acquisition channels',
      'Optimize onboarding',
      'Build referral engine',
    ],
    artifacts: [
      'Growth Playbook',
      'Referral System',
      'Cohort Analysis Dashboard',
    ],
    successMetrics: [
      'MoM growth >15%',
      'CAC decrease quarter over quarter',
    ],
    nextStageTrigger: 'Sustainable growth engine with proven unit economics',
  },
  [StartupStage.Scale]: {
    goals: [
      'Expand market reach',
      'Build operational excellence',
      'Establish repeatable playbook',
    ],
    artifacts: [
      'Org Chart',
      'Infrastructure Scaling Plan',
      'Playbook v1.0',
    ],
    successMetrics: [
      'Team scaled to 10+ people',
      'Processes documented',
    ],
    nextStageTrigger: 'Market expansion successful OR operational maturity reached',
  },
  [StartupStage.Optimize]: {
    goals: [
      'Maximize LTV',
      'Minimize CAC',
      'Build moat through network effects',
    ],
    artifacts: [
      'Unit Economics Dashboard',
      'Competitive Moat Analysis',
    ],
    successMetrics: [
      'LTV/CAC ratio >3',
      'Net Revenue Retention >100%',
    ],
    nextStageTrigger: 'Maximum operational efficiency with clear exit signals',
  },
  [StartupStage.Exit]: {
    goals: [
      'Prepare data room',
      'Identify strategic acquirers',
      'Negotiate terms',
    ],
    artifacts: [
      'Data Room',
      'Exit Strategy Document',
      'Financial Model',
    ],
    successMetrics: [
      'Acquisition offer OR IPO readiness',
    ],
    nextStageTrigger: 'Closing of deal',
  },
};

export const STAGE_COLORS: Record<StartupStage, string> = {
  [StartupStage.Ideation]: '#8888ff',
  [StartupStage.Validation]: '#ffaa00',
  [StartupStage.Prototype]: '#ff8800',
  [StartupStage.MVP]: '#00cc66',
  [StartupStage.Growth]: '#00aaee',
  [StartupStage.Scale]: '#aa44ff',
  [StartupStage.Optimize]: '#ff4488',
  [StartupStage.Exit]: '#666666',
};

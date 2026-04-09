export enum StartupStage {
    Ideation = 'Ideation',
    Validation = 'Validation',
    Prototype = 'Prototype',
    MVP = 'MVP',
    Growth = 'Growth',
    Scale = 'Scale',
    Optimize = 'Optimize',
    Exit = 'Exit'
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

export const LIFECYCLE_SCHEMA: Record<<StartupStartupStage, StageRequirements> = {
    [StartupStage.Ideation]: {
        goals: ['Define problem statement', 'Identify target audience'],
        artifacts: ['Problem Hypothesis Document'],
        successMetrics: ['Problem-solution fit hypothesis defined'],
        nextStageTrigger: 'Hypothesis signed off'
    },
    [StartupStage.Validation]: {
        goals: ['Conduct customer interviews', 'Analyze competitors'],
        artifacts: ['Validation Report', 'User Personas'],
        successMetrics: ['Positive feedback from >X target users'],
        nextStageTrigger: 'Market demand validated'
    },
    [StartupStage.Prototype]: {
        goals: ['Build core functionality', 'Test usability'],
        artifacts: ['Lo-fi Prototype', 'User Flow Map'],
        successMetrics: ['Core loop proven functional'],
        nextStageTrigger: 'Prototype validated by users'
    },
    [StartupStage.MVP]: {
        goals: ['Launch to early adopters', 'Gather real-world data'],
        artifacts: ['Production MVP', 'Feedback Loop System'],
        successMetrics: ['Retention rate >X%', 'Active users >Y'],
        nextStageTrigger: 'Product-Market Fit (PMF) signals'
    },
    [StartupStage.Growth]: {
        goals: ['Scale acquisition', 'Optimize onboarding'],
        artifacts: ['Growth Playbook', 'Referral System'],
        successMetrics: ['MoM growth >X%'],
        nextStageTrigger: 'Stable growth engine established'
    },
    [StartupStage.Scale]: {
        goals: ['Expand market reach', 'Build operational excellence'],
        artifacts: ['Org Chart', 'Infrastructure Scaling Plan'],
        successMetrics: ['Market share increase'],
        nextStageTrigger: 'Market saturation or operational maturity'
    },
    [StartupStage.Optimize]: {
        goals: ['Maximize LTV', 'Minimize CAC'],
        artifacts: ['Unit Economics Dashboard'],
        successMetrics: ['LTV/CAC ratio > 3'],
        nextStageTrigger: 'Maximum operational efficiency reached'
    },
    [StartupStage.Exit]: {
        goals: ['Prepare for liquidity event', 'Due diligence'],
        artifacts: ['Data Room', 'Exit Strategy Doc'],
        successMetrics: ['Acquisition offer or IPO readiness'],
        nextStageTrigger: 'Closing of deal'
    }
};

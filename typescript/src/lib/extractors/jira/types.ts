// JIRA REST API Interfaces (Mappings)
export interface IJiraApiItem {
  field: string;
  toString: string;
};

export interface IJiraApiHistory {
  id: string;
  items: Array<IJiraApiItem>;
  created: string;
};

export interface IJiraApiChangeLog {
  total: number;
  histories: Array<IJiraApiHistory>;
};

export interface IJiraApiIssue {
  key: string;
  fields: any;
  changelog: IJiraApiChangeLog;
};

export interface IJiraApiIssueList {
  issues: Array<IJiraApiIssue>;
  total: number;
};

export interface IJiraApiWorkflowStatuses {
  self: string;
  description: string;
  name: string;
  id: string;
  statusCategory: any;
}

export interface IJiraApiWorkflow {
  id: string;
  name: string;
  subtask: boolean;
  statuses: Array<IJiraApiWorkflowStatuses>;
}

export interface IJiraApiError {
  errorMessages: Array<string>;
  errors: any;
}

// EXTRACTOR interfaces
export interface IWorkflow {
  [val: string]: Array<string>;
};

export interface IAttributes {
  [val: string]: string;
};

export interface IFeatureFlags {
  [val: string]: boolean;
};

export interface IAuth {
  username?: string;
  password?: string;
  oauth?: {
    consumer_key: string;
    private_key: string,
    token: string;
    token_secret: string;
    signature_method: string;
  };
}

export interface IJiraExtractorConfig {
  connection?: {
    url?: string;
    auth?: IAuth;
  };
  projects?: Array<string>;
  issueTypes?: Array<string>;
  filters?: Array<string>;
  startDate?: Date;
  endDate?: Date;
  customJql?: string;
  workflow?: IWorkflow;
  attributes?: IAttributes;
  featureFlags?: IFeatureFlags;
  batchSize?: number;
};

// JIRA REST API Interfaces (Mappings)
export interface IItem {
  field: string;
  toString: string;
};

export interface IHistory {
  id: string;
  items: Array<IItem>;
  created: string;
};

export interface IChangeLog {
  total: number;
  histories: Array<IHistory>;
};

export interface IIssue {
  key: string;
  fields: any;
  changelog: IChangeLog;
};

export interface IIssueList {
  issues: Array<IIssue>;
  total: number;
};

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

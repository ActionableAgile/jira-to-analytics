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
};

// Internal Jira Extractor Settings Interface
export interface IJiraSettings {
  Connection?: {
    Domain?: string;
    Username?: string;
    Password?: string;
    ApiUrl?: string;
    OAuth?: any;
  };
  Criteria?: {
    Projects?: Array<string>;
    IssueTypes?: Array<string>;
    Filters?: Array<string>;
    StartDate?: Date;
    EndDate?: Date;
    JQL: string;
  };
  Workflow?: {};
  Attributes?: {};
  FeatureFlags?: {
    [index: string]: boolean;
  };
};
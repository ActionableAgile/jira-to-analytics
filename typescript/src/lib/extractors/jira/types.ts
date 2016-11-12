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
    Domain: string; // whats the difference??
    Username?: string;
    Password?: string;
    ApiUrl?: string; // whats the difference??
    OAuth?: {
      consumer_key: string;
      private_key: string,
      token: string;
      token_secret: string;
      signature_method: string;
    };
    // ProxyUrl: string;
    // SslSelfSignedCert: string;
  };
  Criteria?: {
    Projects?: Array<string>;
    IssueTypes?: Array<string>;
    Filters?: Array<string>;
    StartDate?: Date;
    EndDate?: Date;
    CustomJql?: string;
  };
  Workflow?: {
    [val: string]: Array<string>;
  };
  Attributes?: {};
  FeatureFlags?: {
    [index: string]: boolean;
  };
};

export interface IJiraExtractorConfig {
  connection?: {
    url?: string;
    auth?: {
      username?: string;
      password?: string;
      oauth?: {
        consumer_key: string;
        private_key: string,
        token: string;
        token_secret: string;
        signature_method: string;
      };
    };
  }
  projects?: Array<string>;
  issueTypes?: Array<string>;
  filters?: Array<string>;
  startDate?: Date;
  endDate?: Date;
  customJql?: string;
  workflow?: {
    [val: string]: Array<string>;
  };
  attributes?: {
    [val: string]: string;
  };
  featureFlags?: {
    [val: string]: boolean;
  };
  batchSize?: number;
}
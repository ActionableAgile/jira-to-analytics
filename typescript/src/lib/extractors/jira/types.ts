// JIRA REST API Interfaces (Mappings)
interface IItem {
  field: string;
  toString: string;
};

interface IHistory {
  id: string;
  items: Array<IItem>;
  created: string;
};

interface IChangeLog {
  total: number;
  histories: Array<IHistory>;
};

interface IIssue {
  key: string;
  fields: any;
  changelog: IChangeLog;
};

interface IIssueList {
  issues: Array<IIssue>;
};

// Internal Jira Extractor Settings Interface
interface IJiraSettings {
  Connection?: {
    Domain?: string,
    Username?: string,
    Password?: string,
    ApiUrl?: string,
  };
  Criteria?: {
    Projects?: Array<string>,
    IssueTypes?: Array<string>,
    Filters?: Array<string>,
  };
  Workflow?: {};
  Attributes?: {};
};
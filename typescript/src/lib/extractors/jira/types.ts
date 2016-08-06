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
  Connection: {
    Domain: string,
    Username?: string,
    Password?: string,
  };
  Criteria: {
    Projects: Array<string>,
    IssueTypes: Array<string>,
    ValidResolutions?: Array<string>,
    Filters?: Array<string>,
    JQL?: string,
  };
  Workflow: {};
  Attributes: {};
  Stages: Array<string>;
  StageMap: Map<string, number>;
  ApiUrl: string;
  CreateInFirstStage: boolean;
  ResolvedInLastStage: boolean;
};
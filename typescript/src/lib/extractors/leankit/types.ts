// Internal Jira Extractor Settings Interface
export interface ILeanKitSettings {
  Connection?: {
    Domain?: string,
    Username?: string,
    Password?: string,
  };
  Criteria?: {
    Projects?: Array<string>,
    IssueTypes?: Array<string>,
  };
  Workflow?: {};
  Attributes?: {};
};


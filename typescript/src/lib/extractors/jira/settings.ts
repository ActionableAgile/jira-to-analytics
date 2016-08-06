class JiraSettings implements IJiraSettings {
  Connection: {
    Domain: string,
    Username: string,
    Password: string,
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

  constructor(config: any, source: string) {
    switch (source.toUpperCase()) {
      case 'YAML':
        this.Connection = config.Connection;

        if (config.legacy) {
          const Projects: string[] = convertCsvStringToArray(config.Criteria.Projects); // legacy yaml is Projects (with an s)
          const IssueTypes: string[] = convertCsvStringToArray(config.Criteria.Types); // legacy yaml is Types
          const ValidResolutions: string[] = convertCsvStringToArray(config.Criteria['Valid resolutions']); // not used in legacy
          const Filters: string[] = convertCsvStringToArray(config.Criteria.Filters);
          const JQL: string = config.Criteria.JQL ? config.Criteria.JQL : ''; // fix this, need to put this in an array
          this.Criteria = { Projects, IssueTypes, ValidResolutions, Filters, JQL };
        } else {
          const Projects: string[] = convertToArray(config.Criteria.Project); // cur yaml is Project
          const IssueTypes: string[] = convertToArray(config.Criteria['Issue types']); // cur yaml is Issue types
          const ValidResolutions: string[] = convertToArray(config.Criteria['Valid resolutions']);
          const Filters: string[] = convertToArray(config.Criteria.Filters);
          const JQL: string = config.Criteria.JQL ? config.Criteria.JQL : '';
          this.Criteria = { Projects, IssueTypes, ValidResolutions, Filters, JQL };
        }

        // if (this.Criteria.JQL) {
        //   console.warn('Custom JQL not currently supported');
        // }

        // if (this.Criteria.ValidResolutions) {
        //   console.warn('Valid Resolutions not currently supported');
        // }

        const workflow = config.legacy 
          ? convertWorkflowToArray(config.Workflow, convertCsvStringToArray) 
          : convertWorkflowToArray(config.Workflow, convertToArray);
        this.Workflow = workflow;

        this.Attributes = config.Attributes;

        const createInFirstStage = workflow[Object.keys(workflow)[0]].includes('(Created)');
        const resolvedInLastStage = workflow[Object.keys(workflow)[Object.keys(workflow).length - 1]].includes('(Resolved)');

        this.CreateInFirstStage = createInFirstStage;
        this.ResolvedInLastStage = resolvedInLastStage;
        this.ApiUrl = `${config.Connection.Domain}/rest/api/latest`;

        const stages = Object.keys(this.Workflow);
        const stageMap = stages.reduce((map: Map<string, number>, stage: string, i: number) => {
          return this.Workflow[stage].reduce((map: Map<string, number>, stageAlias: string) => {
            return map.set(stageAlias, i);
          }, map);
        }, new Map<string, number>());
        this.StageMap = stageMap;
        this.Stages = stages;
        return;
      default:
        throw new Error(`${source} source not found`);
    }
  }
}

const convertWorkflowToArray = (workflowObject: any, extractFunction: any) => {
  const res = {};
  Object.keys(workflowObject).forEach(key => {
    res[key] = extractFunction(workflowObject[key]);
  });
  return res;
};

const convertToArray = (obj: string[] | string): string[] => {
  if (obj === undefined || obj == null) return [];
  return obj instanceof Array ? obj : [obj];
};

const convertCsvStringToArray = (s: string): string[] => {
  if (s === undefined || s == null) return [];
  return s.split(',').map(x => x.trim());
};

export {
  JiraSettings,
};

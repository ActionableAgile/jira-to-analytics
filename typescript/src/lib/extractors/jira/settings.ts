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

  constructor(settings: any, source: string) {
    switch (source.toUpperCase()) {
      case 'YAML':
        this.Connection = settings.Connection;

        if (settings.legacy) {
          const Projects: string[] = convertCsvStringToArray(settings.Criteria.Projects); // legacy yaml is Projects (with an s)
          const IssueTypes: string[] = convertCsvStringToArray(settings.Criteria.Types); // legacy yaml is Types
          const ValidResolutions: string[] = convertCsvStringToArray(settings.Criteria['Valid resolutions']); // not used in legacy
          const Filters: string[] = convertCsvStringToArray(settings.Criteria.Filters);
          const JQL: string = settings.Criteria.JQL ? settings.Criteria.JQL : ''; // fix this, need to put this in an array
          this.Criteria = { Projects, IssueTypes, ValidResolutions, Filters, JQL };
        } else {
          const Projects: string[] = convertToArray(settings.Criteria.Project); // cur yaml is Project
          const IssueTypes: string[] = convertToArray(settings.Criteria['Issue types']); // cur yaml is Issue types
          const ValidResolutions: string[] = convertToArray(settings.Criteria['Valid resolutions']);
          const Filters: string[] = convertToArray(settings.Criteria.Filters);
          const JQL: string = settings.Criteria.JQL ? settings.Criteria.JQL : '';
          this.Criteria = { Projects, IssueTypes, ValidResolutions, Filters, JQL };
        }

        // if (this.Criteria.JQL) {
        //   console.warn('Custom JQL not currently supported');
        // }

        // if (this.Criteria.ValidResolutions) {
        //   console.warn('Valid Resolutions not currently supported');
        // }

        const workflow = settings.legacy 
          ? convertWorkflowToArray(settings.Workflow, convertCsvStringToArray) 
          : convertWorkflowToArray(settings.Workflow, convertToArray);
        this.Workflow = workflow;

        this.Attributes = settings.Attributes;

        const createInFirstStage = workflow[Object.keys(workflow)[0]].includes('(Created)');
        const resolvedInLastStage = workflow[Object.keys(workflow)[Object.keys(workflow).length - 1]].includes('(Resolved)');

        this.CreateInFirstStage = createInFirstStage;
        this.ResolvedInLastStage = resolvedInLastStage;
        this.ApiUrl = `${settings.Connection.Domain}/rest/api/latest`;

        // console.log('before');
        // console.log(settings);
        // console.log('//////////////////////////////////////');
        // console.log('after');
        // console.log(this);
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
  IJiraSettings,
  JiraSettings,
};

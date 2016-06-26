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
  StageMap: Map<any, any>;
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
  StageMap: Map<any, any>;
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
          const JQL: string = settings.Criteria.JQL; // fix this, need to put this in an array
          this.Criteria = { Projects, IssueTypes, ValidResolutions, Filters, JQL };
        } else {
          const Projects: string[] = convertToArray(settings.Criteria.Project); // cur yaml is Project
          const IssueTypes: string[] = convertToArray(settings.Criteria['Issue types']); // cur yaml is Issue types
          const ValidResolutions: string[] = convertToArray(settings.Criteria['Valid resolutions']);
          const Filters: string[] = convertToArray(settings.Criteria.Filters);
          const JQL: string = settings.Criteria.JQL;
          this.Criteria = { Projects, IssueTypes, ValidResolutions, Filters, JQL };
        }

        if (this.Criteria.JQL) {
          console.warn('Custom JQL not currently supported');
        }

        if (this.Criteria.ValidResolutions) {
          console.warn('Valid Resolutions not currently supported');
        }

        const workflow = settings.legacy 
          ? getWorkflowArray(settings.Workflow, convertCsvStringToArray) 
          : getWorkflowArray(settings.Workflow, convertToArray);
        this.Workflow = workflow;

        this.Attributes = settings.Attributes;

        // setup others
        const stages = Object.keys(workflow);
        const stageMap = stages.reduce((map, stage, i) => {
          return workflow[stage].reduce((map, stageAlias) => {
            return map.set(stageAlias, i);
          }, map);
        }, new Map<string, number>());

        const createInFirstStage = stageMap.get('(Created)') === 0 ? true : false;
        const resolvedInLastStage = stageMap.get('(Resolved)') === stages.length - 1 ? true : false;
        if (stageMap.get('(Resolved)') && stageMap.get('(Resolved)') !== stages.length - 1) {
          throw new Error('(Resolved) can only by used in last stage');
        }
        this.CreateInFirstStage = createInFirstStage;
        this.ResolvedInLastStage = resolvedInLastStage;
        this.Stages = stages;
        this.StageMap = stageMap;
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

const getWorkflowArray = (workflowObject: any, extractFunction) => {
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

const restApiPath = '/rest/api/latest';
const buildApiUrl = (rootUrl) => `${rootUrl}${restApiPath}`;

const convertYamlToJiraSettings = (config): IJiraSettings => {
  const jiraSettings: IJiraSettings = {};

  const connection = config.Connection;
  jiraSettings.Connection = connection;
  jiraSettings.Connection.ApiUrl = buildApiUrl(jiraSettings.Connection.Domain);
  console.log(jiraSettings.Connection.ApiUrl);
  
  if (config.legacy) {
    const Projects: string[] = convertCsvStringToArray(config.Criteria.Projects); // legacy yaml is Projects (with an s)
    const IssueTypes: string[] = convertCsvStringToArray(config.Criteria.Types); // legacy yaml is Types
    const ValidResolutions: string[] = convertCsvStringToArray(config.Criteria['Valid resolutions']); // not used in legacy
    const Filters: string[] = convertCsvStringToArray(config.Criteria.Filters);
    const JQL: string = config.Criteria.JQL ? config.Criteria.JQL : ''; // fix this, need to put this in an array

    const criteria = { Projects, IssueTypes, Filters, };
    jiraSettings.Criteria = criteria;
  } else {
    const Projects: string[] = convertToArray(config.Criteria.Project); // cur yaml is Project
    const IssueTypes: string[] = convertToArray(config.Criteria['Issue types']); // cur yaml is Issue types
    const ValidResolutions: string[] = convertToArray(config.Criteria['Valid resolutions']);
    const Filters: string[] = convertToArray(config.Criteria.Filters);
    const JQL: string = config.Criteria.JQL ? config.Criteria.JQL : '';

    const criteria = { Projects, IssueTypes, Filters, }
    jiraSettings.Criteria = criteria;
  }

  const workflow = config.legacy 
    ? convertWorkflowToArray(config.Workflow, convertCsvStringToArray) 
    : convertWorkflowToArray(config.Workflow, convertToArray);
  jiraSettings.Workflow = workflow;

  const attributes = config.Attributes;
  jiraSettings.Attributes = attributes;

  // const createInFirstStage = workflow[Object.keys(workflow)[0]].includes('(Created)');
  // jiraSettings.CreateInFirstStage = createInFirstStage;

  // const resolvedInLastStage = workflow[Object.keys(workflow)[Object.keys(workflow).length - 1]].includes('(Resolved)');
  // jiraSettings.ResolvedInLastStage = resolvedInLastStage;
  return jiraSettings;
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
  convertYamlToJiraSettings,
}
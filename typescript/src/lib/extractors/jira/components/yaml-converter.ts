import { IJiraSettings, IJiraExtractorConfig} from '../types';

const restApiPath = '/rest/api/latest';
const buildApiUrl = (rootUrl) => `${rootUrl}${restApiPath}`;
const buildOAuth = (config) => {
  return {
    consumer_key: config['Consumer Key'],
    private_key: config['Private Key'],
    token: config['Token'],
    token_secret: config['Token Secret'],
    signature_method: 'RSA-SHA1',
  };
};

const convertYamlToNewJiraConfig = (j: IJiraSettings) => {
  const x: IJiraExtractorConfig = {
    attributes: j.Attributes,
    connection: {
      auth: {
        username: j.Connection.Username,
        password: j.Connection.Password,
        oauth: j.Connection.OAuth,
      },
      url: j.Connection.Domain, // or domainurl..
    },
    customJql: j.Criteria.CustomJql,
    endDate: j.Criteria.EndDate,
    featureFlags: j.FeatureFlags,
    filters: j.Criteria.Filters,
    issueTypes: j.Criteria.IssueTypes,
    projects: j.Criteria.Projects,
    startDate: j.Criteria.StartDate,
    workflow: j.Workflow,
  };

  return x;
};

const convertYamlToJiraSettings = (config): IJiraSettings => {
  const jiraSettings: IJiraSettings = {};

  const connection = config.Connection;
  jiraSettings.Connection = connection;
  jiraSettings.Connection.OAuth = buildOAuth(jiraSettings.Connection);
  jiraSettings.Connection.ApiUrl = buildApiUrl(jiraSettings.Connection.Domain);

  if (config.legacy) {
    const Projects: string[] = convertCsvStringToArray(config.Criteria.Projects); // legacy yaml is Projects (with an s)
    const IssueTypes: string[] = convertCsvStringToArray(config.Criteria.Types); // legacy yaml is Types
    const ValidResolutions: string[] = convertCsvStringToArray(config.Criteria['Valid resolutions']); // not used in legacy
    const StartDate: Date = config.Criteria['Start Date'] || null;
    const EndDate: Date = config.Criteria['End Date'] || null;
    const Filters: string[] = convertCsvStringToArray(config.Criteria.Filters);
    const CustomJql: string = config.Criteria.JQL ? config.Criteria.JQL : ''; // fix this, need to put this in an Array

    const criteria = { Projects, IssueTypes, Filters, StartDate, EndDate, CustomJql };
    jiraSettings.Criteria = criteria;
  } else {
    const Projects: string[] = convertToArray(config.Criteria.Project); // cur yaml is Project
    const IssueTypes: string[] = convertToArray(config.Criteria['Issue types']); // cur yaml is Issue types
    const ValidResolutions: string[] = convertToArray(config.Criteria['Valid resolutions']);
    const StartDate: Date = config.Criteria['Start Date'] || null;
    const EndDate: Date = config.Criteria['End Date'] || null;
    const Filters: string[] = convertToArray(config.Criteria.Filters);
    const CustomJql: string = config.Criteria.JQL ? config.Criteria.JQL : '';

    const criteria = { Projects, IssueTypes, Filters, StartDate, EndDate, CustomJql };
    jiraSettings.Criteria = criteria;
  }

  const workflow = config.legacy 
    ? convertWorkflowToArray(config.Workflow, convertCsvStringToArray)
    : convertWorkflowToArray(config.Workflow, convertToArray);
  jiraSettings.Workflow = workflow;

  const attributes = config.Attributes;
  jiraSettings.Attributes = attributes;

  const featureFlags = config['Feature Flags'];
  jiraSettings.FeatureFlags = featureFlags;

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
  convertYamlToNewJiraConfig
}
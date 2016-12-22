import { JiraExtractorConfig } from '../types';

const buildOAuth = (oauthYamlObj) => {
  return {
    consumer_key: oauthYamlObj['Consumer Key'],
    private_key: oauthYamlObj['Private Key'],
    token: oauthYamlObj['Token'],
    token_secret: oauthYamlObj['Token Secret'],
    signature_method: 'RSA-SHA1',
  };
};

const convertWorkflowToArray = (workflowObject: any, extractFunction: any) => {
  const res = {};
  Object.keys(workflowObject).forEach(key => {
    res[key] = extractFunction(workflowObject[key]);
  });
  return res;
};

const convertToArray = (obj: string[] | string): string[] => {
  if (obj === undefined || obj == null) {
    return [];
  }
  return obj instanceof Array ? obj : [obj];
};

const convertCsvStringToArray = (s: string): string[] => {
  if (s === undefined || s == null) {
    return [];
  } else {
    return s.split(',').map(x => x.trim());
  }
};

const convertYamlToJiraSettings = (config: any): JiraExtractorConfig => {
  const c: JiraExtractorConfig = {};

  c.batchSize = config.BatchSize || 25;
  c.attributes = config.Attributes;
  c.connection = {
    url: config.Connection.Domain || null,
    auth: {
      username: config.Connection.Username || null,
      password: config.Connection.Password || null,
      oauth: buildOAuth(config.Connection) || null,
    }
  };

  c.projects = config.legacy ? convertCsvStringToArray(config.Criteria.Projects) : convertToArray(config.Criteria.Project);
  c.issueTypes = config.legacy ? convertCsvStringToArray(config.Criteria['Types']) : convertToArray(config.Criteria['Issue types']);
  c.filters = config.legacy ? convertCsvStringToArray(config.Criteria.Filters) : convertToArray(config.Criteria.Filters);
  c.startDate = config.Criteria['Start Date'] || null;
  c.endDate = config.Criteria['End Date'] || null;
  c.customJql = config.Criteria.JQL ? config.Criteria.JQL : ''; // fix this, need to put this in an Array
  c.workflow = config.legacy
    ? convertWorkflowToArray(config.Workflow, convertCsvStringToArray)
    : convertWorkflowToArray(config.Workflow, convertToArray);
  c.attributes = config.Attributes;

  c.featureFlags = config['Feature Flags'];

  return c;
};

export {
  convertYamlToJiraSettings,
};
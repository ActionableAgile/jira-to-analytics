import { get } from 'request';
import { readFileSync, existsSync } from 'fs';
import { buildJiraSearchQueryUrl } from './query-builder'; // move this dependency around.
import { IIssueList, IIssue, IJiraExtractorConfig, IAuth } from '../types';

const getJson = (url: string, auth: IAuth): Promise<IIssueList> => {
  return new Promise((accept, reject) => {
    const options = {
      url,
      json: true,
    };
    if (auth.oauth && auth.oauth.private_key && auth.oauth.token) {
      // Handle OAuth
      const oauth = auth.oauth;
      Object.assign(options, { oauth });
    } else if (auth.username && auth.password) {
      // Handle Basic Auth
      const headers = {
        'Authorization': `Basic ${new Buffer(auth.username + ':' + auth.password).toString('base64')}`,
      };
      Object.assign(options, { headers });
    }
    if (existsSync('ca.cert.pem')) {
      // Handle Custom Self signed Cert
      const cert = readFileSync('ca.cert.pem');
      const agentOptions = {
        ca: cert,
      };
      Object.assign(options, { agentOptions });
    }
    get(options, (error, response, body) => {
      if (error) {
        console.log(`Error fetching json from ${url}`);
        reject(new Error(error));
      } else {
        accept(body);
      }
    });
  });
};

const getIssues = async (config: IJiraExtractorConfig, startIndex: number, batchSize: number): Promise<IIssue[]> => {
  const queryUrl: string = buildJiraSearchQueryUrl(
    { apiRootUrl: config.connection.url,
      projects: config.projects,
      issueTypes: config.issueTypes,
      filters: config.filters,
      startDate: config.startDate,
      endDate: config.endDate,
      customJql: config.customJql,
      startIndex,
      batchSize
    }
  );
  const result: IIssueList = await getJson(
    queryUrl,
    config.connection.auth);

  if (result.issues) {
      const issues: IIssue[] = result.issues;
      return issues;
  } else {
      throw new Error('Could not retrieve issues from object');
  }
};

const getMetadata = async (config: IJiraExtractorConfig): Promise<IIssueList> => {
  const queryUrl: string = buildJiraSearchQueryUrl(
    { apiRootUrl: config.connection.url,
      projects: config.projects,
      issueTypes: config.issueTypes,
      filters: config.filters,
      startDate: config.startDate,
      endDate: config.endDate,
      customJql: config.customJql,
      startIndex: 0,
      batchSize: 1
    });
  const metadata = await getJson(queryUrl, config.connection.auth);
  return metadata;
};

// const testConnection = async function(apiUrl: string, username?: string, password?: string) {
//   const url = buildJiraGetProjectsUrl(apiUrl);
//   const projects = await makeRequest(url, username, password);
//   return projects.length ? true : false;
// };

// const getProjects = async function(apiUrl :string, username?: string, password?: string) {
//   const url = buildJiraGetProjectsUrl(apiUrl);
//   const projects = await makeRequest(url, username, password);
//   return projects;
// };

// const getWorkflows = async function(project: string, apiUrl :string, username?: string, password?: string) {
//   const url = buildJiraGetWorkflowsUrl(apiUrl, project);
//   const workflows = await makeRequest(url, username, password);
//   return workflows;
// };

export {
  getIssues,
  getMetadata,
};
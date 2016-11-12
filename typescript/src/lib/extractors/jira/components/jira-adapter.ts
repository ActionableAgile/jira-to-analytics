import * as request from 'request';
// import * as fs from 'fs';
import { buildJiraSearchQueryUrl } from './query-builder';
import { IIssueList, IIssue, IJiraExtractorConfig } from '../types';

const getJsonFromUrlViaOauth = (url, oauth): Promise<any> => {
  return new Promise((accept, reject) => {
    request.get({
      url,
      oauth: oauth,
      json: true,
    }, (error, response, body) => {
      if (error) {
        console.log(`Error fetching json from ${url}`);
        reject(new Error(error));
      } else {
        accept(body);
      }
    });
  });
};

const getJsonFromSelfSignedSSLUrl = (url, username, password) => {
  return new Promise((accept, reject) => {
    request.get(url, {
      headers: {
        'Authorization': `Basic ${new Buffer(username + ':' + password).toString('base64')}`
      },
      // agentOptions: {
      //   ca: fs.readFileSync('ca.cert.pem')
      // },
      json: true,
    }, (error, response, body) => {
      if (error) {
        console.log(`Error fetching json from ${url}`);
        reject(new Error(error));
      } else {
        accept(body);
      };
    });
  });
};

const makeRequest = async (url, username, password, oauth) => {
  if (username == undefined || username === null) {
    const json: any = await getJsonFromUrlViaOauth(url, oauth);
    return json;
  } else {
    const json: any = await getJsonFromSelfSignedSSLUrl(url, username, password);
    return json;
  }
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
  const result: IIssueList = await makeRequest(
    queryUrl,
    config.connection.auth.username,
    config.connection.auth.password,
    config.connection.auth.oauth);

  if (result.issues) {
      const issues: IIssue[] = result.issues;
      return issues;
  } else {
      throw new Error('Could not retrieve issues from object');
  }
};

const getMetadata = async (config: IJiraExtractorConfig): Promise<any> => {
  const queryUrl = buildJiraSearchQueryUrl(
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
  const metadata = await makeRequest(queryUrl, config.connection.auth.username, config.connection.auth.password, config.connection.auth.oauth);
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
  makeRequest,
};
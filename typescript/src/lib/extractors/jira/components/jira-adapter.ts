import { getJsonFromUrl, getHeaders, getJsonFromUrlViaOauth, getJsonFromSelfSignedSSLUrl } from '../../../core/http';
import { buildJiraSearchQueryUrl, buildJiraGetProjectsUrl, buildJiraGetWorkflowsUrl } from './query-builder';
import { IIssueList, IIssue } from '../types';

const getIssues = async function(apiUrl, projects, issueTypes, filters, workflow, startDate, endDate, customJql, startIndex, batchSize, username: string, password: string, oauth): Promise<IIssue[]> {
  const queryUrl: string = buildJiraSearchQueryUrl(apiUrl, projects, issueTypes, filters, workflow, startDate, endDate, customJql, startIndex, batchSize);
  const result: IIssueList = await makeRequest(queryUrl, username, password, oauth);
  if (result.issues) {
      const issues: IIssue[] = result.issues;
      return issues;
  } else {
      throw new Error('Could not retrieve issues from object');
  }
};

const getMetadata = async function(apiUrl, projects, issueTypes, filters, workflow, startDate, endDate, customJql, startIndex, batchSize, username: string, password: string, oauth): Promise<any> {
  const queryUrl = buildJiraSearchQueryUrl(apiUrl, projects, issueTypes, filters, workflow, startDate, endDate, customJql, startIndex, batchSize);
  const metadata = await makeRequest(queryUrl, username, password, oauth);
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

const makeRequest =  async function(url, username, password, oauth) {

  const json: any = await getJsonFromSelfSignedSSLUrl(url, username, password);
  return json;

  // if (username == undefined || username === null) {
  //   const json: any = await getJsonFromUrlViaOauth(url, oauth);
  //   return json;
  // } else {
  //   const headers: Headers = getHeaders(username, password);
  //   const json: any = await getJsonFromUrl(url, headers);   
  //   return json;
  // }
  // const headers: Headers = getHeaders(username, password);
  // const json: any = await getJsonFromUrl(url, headers);   
  // return json;
};

export {
  getIssues,
  getMetadata,
  // testConnection,
  // getProjects,
  // getWorkflows,
  makeRequest,
};
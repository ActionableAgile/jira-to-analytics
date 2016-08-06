import { getJsonFromUrl, getHeaders } from '../../../core/http';
import { buildJiraSearchQueryUrl, buildJiraGetProjectsUrl, buildJiraGetWorkflowsUrl } from './query-builder';

const getIssues = async function(query: string, username: string, password: string): Promise<IIssue[]> {
  const headers: Headers = getHeaders(username, password);
  const result: IIssueList = await getJsonFromUrl(query, headers);
  if (result.issues) {
      const issues: IIssue[] = result.issues;
      return issues;
  } else {
      throw new Error('Could not retrieve issues from object');
  }
};

const testConnection = async function(apiUrl: string, username?: string, password?: string) {
  const url = buildJiraGetProjectsUrl(apiUrl);
  const headers: Headers = getHeaders(username, password);
  const projects: any[] = await getJsonFromUrl(url, headers);
  return projects.length ? true : false;
};

const getProjects = async function(apiUrl :string, username?: string, password?: string) {
  const url = buildJiraGetProjectsUrl(apiUrl);
  const headers: Headers = getHeaders(username, password);
  const projects: any[] = await getJsonFromUrl(url, headers);
  return projects;
};

const getWorkflows = async function(project: string, apiUrl :string, username?: string, password?: string) {
  const url = buildJiraGetWorkflowsUrl(project, apiUrl);
  const headers: Headers = getHeaders(username, password);
  const workflows: any[] = await getJsonFromUrl(url, headers);    
  return workflows;
};

export {
  getIssues,
  testConnection,
  getProjects,
  getWorkflows,
};
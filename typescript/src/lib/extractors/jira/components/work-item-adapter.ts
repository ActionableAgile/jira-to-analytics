import { getJsonFromUrl, getHeaders } from '../../../core/http';
import { buildJiraSearchQueryUrl } from './query-builder';
import { WorkItem } from'../../../core/work-item';
import { getStagingDates } from './staging-parser';
import { getAttributes } from './attribute-parser';
import { getIssues } from './jira-adapter';

const getWorkItems = async function(settings: IJiraSettings, statusHook) {

  const apiUrl = settings.ApiUrl;
  const projects = settings.Criteria.Projects;
  const issueTypes = settings.Criteria.IssueTypes;
  const filters = settings.Criteria.Filters;
  const stages = settings.Stages;
  const stageMap = settings.StageMap;
  const createInFirstStage = settings.CreateInFirstStage;
  const resolvedInLastStage = settings.ResolvedInLastStage;
  const attributes = settings.Attributes;
  const username = settings.Connection.Username;
  const password = settings.Connection.Password;

  const workItems = await getAllWorkItemsFromJiraApi(apiUrl, projects, issueTypes, filters, stages, stageMap, createInFirstStage, resolvedInLastStage, attributes, username, password, statusHook);
  return workItems;
};

const getWorkItemMetadata = async function(
  apiUrl: string, 
  projects: string[], 
  issueTypes: string[], 
  filters: string[], 
  username?: string, 
  password?: string): Promise<any> {
  
  // todo remove this
  const url = buildJiraSearchQueryUrl(apiUrl, projects, issueTypes, filters)
  const headers = getHeaders(username, password);
  const metadata = await getJsonFromUrl(url, headers);
  return metadata;
};

const createWorkItem = (
  issue: IIssue,
  stages: string[],
  stageMap: Map<string, number>,
  createInFirstStage: boolean,
  resolvedInLastStage: boolean,
  attributes: any
): IWorkItem => {
  const key: string = issue.key;
  const name: string = issue.fields['summary'];
  // refactor this one
  const stagingDates = getStagingDates(issue, stages, stageMap, createInFirstStage, resolvedInLastStage);
  const type = issue.fields.issuetype.name ? issue.fields.issuetype.name : '';

  const requestedAttributeSystemNames: string[] = Object.keys(attributes).map(key => attributes[key]);
  const attributesMap = getAttributes(issue.fields, requestedAttributeSystemNames);

  const workItem = new WorkItem(key, stagingDates, name, type, attributesMap);
  return workItem;
};

const getWorkItemsBatch = async function(
  start: number, 
  batchSize: number, 
  apiUrl: string,
  projects: string[],
  issueTypes: string[],
  filters: string[],
  stages, 
  stageMap, 
  createInFirstStage, 
  resolvedInLastStage, 
  attributes,
  username?: string,
  password?: string): Promise<IWorkItem[]> {

  const url = buildJiraSearchQueryUrl(
    apiUrl, 
    projects, 
    issueTypes, 
    filters, 
    start, 
    batchSize
  );
  const issues = await getIssues(url, username, password);
  const workItems = issues.map(issue => createWorkItem(issue, stages, stageMap, createInFirstStage, resolvedInLastStage, attributes)); // need all these params... probably break up this function
  return workItems;
};

const getAllWorkItemsFromJiraApi = async function(
  apiUrl, 
  projects, 
  issueTypes, 
  filters, 
  stages, 
  stageMap, 
  createInFirstStage, 
  resolvedInLastStage, 
  attributes, 
  username, 
  password, 
  hook: any = () => {}, 
  resultsPerBatch = 25): Promise<IWorkItem[]> {

  const metadata = await getWorkItemMetadata(apiUrl, projects, issueTypes, filters, username, password);
  const totalJiras: number = metadata.total; 
  const batchSize: number = resultsPerBatch;
  const totalBatches: number = Math.ceil(totalJiras / batchSize); 

  const allWorkItems: IWorkItem[] = [];
  hook(0);
  for  (let i = 0; i < totalBatches; i++) {
    const workItemBatch = await getWorkItemsBatch(i * batchSize, batchSize, apiUrl, projects, issueTypes, filters, stages, stageMap, createInFirstStage, resolvedInLastStage, attributes, username, password);
    allWorkItems.push(...workItemBatch);
    hook(Math.max(batchSize / totalJiras)*100);
  }
  hook(100);

  return allWorkItems;
};

export {
  getWorkItemMetadata,
  getWorkItems,
  createWorkItem,
  getWorkItemsBatch,
  getAllWorkItemsFromJiraApi,
}
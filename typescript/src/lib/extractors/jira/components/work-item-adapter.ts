import { getJsonFromUrl, getHeaders } from '../../../core/http';
import { buildJiraSearchQueryUrl } from './query-builder';
import { WorkItem } from'../../../core/work-item';
import { getStagingDates } from './staging-parser';
import { getAttributes } from './attribute-parser';
import { getIssues } from './jira-adapter';

// const getWorkItems = async function(settings: IJiraSettings, statusHook: Function = () => {}) {

//   const apiUrl = settings.ApiUrl;
//   const projects = settings.Criteria.Projects;
//   const issueTypes = settings.Criteria.IssueTypes;
//   const filters = settings.Criteria.Filters;
//   const stages = settings.Stages;
//   const stageMap = settings.StageMap;
//   const createInFirstStage = settings.CreateInFirstStage;
//   const resolvedInLastStage = settings.ResolvedInLastStage;
//   const attributes = settings.Attributes;
//   const username = settings.Connection.Username;
//   const password = settings.Connection.Password;
//   const resultsPerBatch = 25;

//   const allWorkItems = await getAllWorkItemsFromJiraApi(apiUrl, projects, issueTypes, filters, stages, stageMap, createInFirstStage, resolvedInLastStage, attributes, username, password, statusHook);
//   return allWorkItems;
// };

const convertIssueToWorkItem = (
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
  const stagingDates: string[] = getStagingDates(issue, stages, stageMap, createInFirstStage, resolvedInLastStage);
  const type: string = issue.fields.issuetype.name ? issue.fields.issuetype.name : '';

  const requestedAttributeSystemNames: string[] = Object.keys(attributes).map(key => attributes[key]);
  const attributesMap: {} = getAttributes(issue.fields, requestedAttributeSystemNames);

  const workItem: WorkItem = new WorkItem(key, stagingDates, name, type, attributesMap);
  return workItem;
};

const convertIssuesToWorkItems = function(
  issues: IIssue[],
  stages: string[], 
  stageMap: Map<string, number>, 
  createInFirstStage: boolean, 
  resolvedInLastStage: boolean, 
  attributes: any): IWorkItem[] {

  const workItems = issues.map(issue => convertIssueToWorkItem(issue, stages, stageMap, createInFirstStage, resolvedInLastStage, attributes)); 
  return workItems;
};

// const getAllWorkItemsFromJiraApi = async function(
//   apiUrl, 
//   projects, 
//   issueTypes, 
//   filters, 
//   stages, 
//   stageMap, 
//   createInFirstStage, 
//   resolvedInLastStage, 
//   attributes, 
//   username, 
//   password, 
//   hook: any = () => {}, 
//   resultsPerBatch = 25): Promise<IWorkItem[]> {

//   const metaDataUrl = buildJiraSearchQueryUrl(apiUrl, projects, issueTypes, filters)
//   const metaDataHeaders = getHeaders(username, password);
//   const metadata = await getJsonFromUrl(metaDataUrl, metaDataHeaders);
  
//   const totalJiras: number = metadata.total; 
//   const batchSize: number = resultsPerBatch;
//   const totalBatches: number = Math.ceil(totalJiras / batchSize); 

//   const allWorkItems: IWorkItem[] = [];
//   hook(0);
//   for (let i = 0; i < totalBatches; i++) {
//     const workItemBatch = await getWorkItemsBatch(i * batchSize, batchSize, apiUrl, projects, issueTypes, filters, stages, stageMap, createInFirstStage, resolvedInLastStage, attributes, username, password);
//     allWorkItems.push(...workItemBatch);
//     hook(Math.max(batchSize / totalJiras)*100);
//   }
//   hook(100);

//   return allWorkItems;
// };

export {
  convertIssuesToWorkItems,
  convertIssueToWorkItem,
};
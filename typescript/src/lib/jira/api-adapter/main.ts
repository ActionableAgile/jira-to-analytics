import { IIssueList, IIssue } from '../models';
import { IJiraSettings } from '../settings';
import { buildJiraQueryUrl } from './components/query-builder';
import { getAttributes } from './components/attribute-parser';
import { IWorkItem, WorkItem } from '../../core/work-item';
import { getJsonFromUrl, getHeaders } from '../../core/http';
import { getStagingDates } from './components/staging-parser';

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

const createWorkItem = (issue: IIssue, settings: IJiraSettings): IWorkItem => {
  const key: string = issue.key;
  const name: string = issue.fields['summary'];
  const stagingDates = getStagingDates(issue, settings.Stages, settings.StageMap, settings.CreateInFirstStage, settings.ResolvedInLastStage);
  const type = issue.fields.issuetype.name ? issue.fields.issuetype.name : '';
  const attributes = getAttributes(issue.fields, settings.Attributes);

  const workItem = new WorkItem(key, stagingDates, name, type, attributes);
  return workItem;
};

const getWorkItemsBatch = async function(start: number, batchSize: number, settings: IJiraSettings): Promise<IWorkItem[]> {
  const url = buildJiraQueryUrl(settings.ApiUrl, settings.Criteria.Projects, settings.Criteria.IssueTypes, settings.Criteria.Filters, start, batchSize);
  const issues = await getIssues(url, settings.Connection.Username, settings.Connection.Password);
  const workItems = issues.map(issue => createWorkItem(issue, settings));
  return workItems;
};

const getAllWorkItemsFromJiraApi = async function(settings: IJiraSettings, resultsPerBatch = 25): Promise<IWorkItem[]> {
  let metadata: any;
  // try {
    metadata = await getJsonFromUrl(
      buildJiraQueryUrl(
        settings.ApiUrl, 
        settings.Criteria.Projects, 
        settings.Criteria.IssueTypes, 
        settings.Criteria.Filters), 
      getHeaders(settings.Connection.Username, settings.Connection.Password)
    );

  const totalJiras: number = metadata.total; 
  const batchSize: number = resultsPerBatch;
  const totalBatches: number = Math.ceil(totalJiras / batchSize); 

  console.log(`Connection successful. ${totalJiras} issues detected.`);

  let allWorkItems: IWorkItem[] = [];
  for  (let i = 0; i < totalBatches; i++) {
    const rangeLower: number = i * batchSize;
    const rangeUpper: number = Math.min((i * batchSize) + batchSize - 1, totalJiras);
    console.log(`Extracting batch ${i + 1}/${totalBatches} -- Isssue(s) ${rangeLower}-${rangeUpper} out of ${totalJiras}`);
    const workItemsBatch = await getWorkItemsBatch(i * batchSize, batchSize, settings);
    allWorkItems.push(...workItemsBatch);
  }
  return allWorkItems;
};

export { 
  getAllWorkItemsFromJiraApi,
  getWorkItemsBatch,
  getStagingDates,
};

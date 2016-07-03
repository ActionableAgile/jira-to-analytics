import { IIssueList, IIssue } from '../models';
import { IJiraSettings } from '../settings';
import { buildJiraQueryUrl } from './components/query-builder';
import { getAttributes } from './components/attribute-parser';
import { IWorkItem, WorkItem } from '../../../core/work-item';
import { getJsonFromUrl, getHeaders } from '../../../core/http';
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

  const requestedAttributeSystemNames: string[] = Object.keys(settings.Attributes).map(key => settings.Attributes[key]);
  const attributes = getAttributes(issue.fields, requestedAttributeSystemNames);

  const workItem = new WorkItem(key, stagingDates, name, type, attributes);
  return workItem;
};

const getWorkItemsBatch = async function(start: number, batchSize: number, settings: IJiraSettings): Promise<IWorkItem[]> {
  const url = buildJiraQueryUrl(
    settings.ApiUrl, 
    settings.Criteria.Projects, 
    settings.Criteria.IssueTypes, 
    settings.Criteria.Filters, 
    start, 
    batchSize
  );
  const issues = await getIssues(url, settings.Connection.Username, settings.Connection.Password);
  const workItems = issues.map(issue => createWorkItem(issue, settings));
  return workItems;
};

const getAllWorkItemsFromJiraApi = async function(settings: IJiraSettings, hook: any = () => {}, resultsPerBatch = 25): Promise<IWorkItem[]> {
  const metadata = await getJsonFromUrl(
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

  // console.log(`Connection successful. ${totalJiras} issues detected.`);

  const allWorkItems: IWorkItem[] = [];
  hook(0);
  for  (let i = 0; i < totalBatches; i++) {
    //log
    const rangeLower: number = i * batchSize;
    const rangeUpper: number = Math.min((i * batchSize) + batchSize - 1, totalJiras);
    // console.log(`Extracting batch ${i + 1}/${totalBatches} -- Isssue(s) ${rangeLower}-${rangeUpper} out of ${totalJiras}`);

    // extract
    const workItemBatch = await getWorkItemsBatch(i * batchSize, batchSize, settings);
    allWorkItems.push(...workItemBatch);
    hook(Math.max(batchSize / totalJiras)*100);
  }

  hook(100);
  return allWorkItems;
};

export { 
  getAllWorkItemsFromJiraApi,
  getWorkItemsBatch,
};

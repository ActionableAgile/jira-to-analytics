import { getIssues, getMetadata } from './jira-adapter';
import { convertIssueToWorkItem } from './work-item-adapter';

const extractBatch = async function(
  apiUrl: string, 
  projects: string[], 
  issueTypes: string[], 
  filters: string[], 
  workflowKeyVal: {}, 
  attributesKeyVal: {}, 
  username?: string, 
  password?: string, 
  startIndex: number = 0, 
  batchSize: number = 1) {
  
  const issues = await getIssues(apiUrl, projects, issueTypes, filters, startIndex, batchSize, username, password);
  return issues.map(issue => convertIssueToWorkItem(issue, workflowKeyVal, attributesKeyVal));
};

const extractAll = async function(
  apiUrl, 
  projects, 
  issueTypes, 
  filters, workflow, 
  attributes, 
  batchSize: number = 25, 
  hook: Function = () => {}, 
  username, 
  password) {

  const metadata = await getMetadata(
    apiUrl, 
    projects, 
    issueTypes, 
    filters, 
    0, 
    1, 
    username, 
    password);

  const totalJiras: number = metadata.total; 
  const actualBatchSize = batchSize ? batchSize : totalJiras;
  const totalBatches: number = Math.ceil(totalJiras / batchSize); 

  hook(0);

  const allWorkItems: IWorkItem[] = [];
  for (let i = 0; i < totalBatches; i++) {
    const start = i * actualBatchSize;
    const workItemBatch = await extractBatch(
      apiUrl, 
      projects, 
      issueTypes, 
      filters, 
      workflow, 
      attributes,
      username, 
      password, 
      start, 
      batchSize);

    allWorkItems.push(...workItemBatch);
    hook(Math.max(actualBatchSize / totalJiras) * 100);
  }

  hook(100);

  return allWorkItems;
};

export {
  extractBatch,
  extractAll,
};
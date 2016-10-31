import { getIssues, getMetadata } from './jira-adapter';
import { convertIssueToWorkItem } from './work-item-adapter';
import { IWorkItem } from '../../../core/types';
import { IJiraSettings } from '../types';

const extractBatchFromConfig = async function(config: IJiraSettings, startIndex: number = 0, batchSize: number = 0) {
    const { apiUrl, projects, issueTypes, filters, workflow, attributes, startDate, endDate, customJql, username, password, oauth}  = destructureConfig(config);
    const issues = await getIssues(apiUrl, projects, issueTypes, filters, workflow, startDate, endDate, customJql, startIndex, batchSize, username, password, oauth);
    return issues.map(issue => convertIssueToWorkItem(issue, workflow, attributes));
}

const extractAllFromConfig = async function(config: IJiraSettings, batchSize: number = 25, hook: Function = () => {}) {

  const apiUrl = config.Connection.ApiUrl;
  const projects = config.Criteria.Projects;
  const issueTypes = config.Criteria.IssueTypes;
  const filters = config.Criteria.Filters;
  const workflow = config.Workflow;
  const attributes = config.Attributes;
  const username = config.Connection.Username;
  const password = config.Connection.Password;
  const startDate = config.Criteria.StartDate;
  const endDate = config.Criteria.EndDate;
  const customJql = config.Criteria.JQL;
  const oauth = config.Connection.OAuth;

  const metadata = await getMetadata(
    apiUrl, 
    projects, 
    issueTypes, 
    filters, 
    workflow, 
    startDate,
    endDate,
    customJql,
    0, 
    1, 
    username, 
    password,
    oauth);

  const totalJiras: number = metadata.total; 
  const actualBatchSize: number = batchSize ? batchSize : totalJiras;
  const totalBatches: number = Math.ceil(totalJiras / batchSize); 

  hook(0);

  const allWorkItems: IWorkItem[] = [];
  for (let i = 0; i < totalBatches; i++) {
    const start = i * actualBatchSize;
    const workItemBatch = await extractBatchFromConfig(
      config, 
      start, 
      batchSize);

    allWorkItems.push(...workItemBatch);
    hook(Math.max(actualBatchSize / totalJiras) * 100);
  }

  hook(100);

  if (config.FeatureFlags) {
    if (config.FeatureFlags['MaskName']) {
      console.log('Removing NAMES');
      allWorkItems.forEach(workItem => {
        delete workItem.Name;
        workItem.Name = '';
      });
    } 
  }

  return allWorkItems;
};

const destructureConfig = (config: IJiraSettings) => {
  const apiUrl = config.Connection.ApiUrl;
  const projects = config.Criteria.Projects;
  const issueTypes = config.Criteria.IssueTypes;
  const filters = config.Criteria.Filters;
  const workflow = config.Workflow;
  const attributes = config.Attributes;
  const username = config.Connection.Username;
  const password = config.Connection.Password;
  const startDate = config.Criteria.StartDate;
  const endDate = config.Criteria.EndDate;
  const customJql = config.Criteria.JQL;
  const oauth = config.Connection.OAuth;

  return {
    apiUrl, 
    projects, 
    issueTypes, 
    filters, 
    workflow, 
    attributes, 
    username, 
    password, 
    startDate, 
    endDate, 
    customJql,
    oauth,
  };
};

export {
  extractBatchFromConfig,
  extractAllFromConfig,
};
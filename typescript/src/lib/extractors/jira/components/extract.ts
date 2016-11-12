import { getIssues, getMetadata } from './jira-adapter';
import { IWorkItem } from '../../../core/types';
import { IJiraSettings, IIssue } from '../types';
import { WorkItem } from'../../../core/work-item';
import { getStagingDates } from './staging-parser';
import { getAttributes } from './attribute-parser';

const extractBatchFromConfig = async function(config: IJiraSettings, startIndex: number = 0, batchSize: number = 0) {
  const { apiUrl, projects, issueTypes, filters, workflow, attributes, startDate, endDate, customJql, username, password, oauth} = destructureConfig(config);
  const apiRootUrl = apiUrl;
  const issues = await getIssues({apiRootUrl, projects, issueTypes, filters, workflow, startDate, endDate, customJql, startIndex, batchSize, username, password, oauth});
  const workItems = issues.map(issue => convertIssueToWorkItem(issue, workflow, attributes));
  return workItems;
}

const extractAllFromConfig = async function(config: IJiraSettings, batchSize: number = 25, hook: Function = () => {}) {

  // const apiUrl = config.Connection.ApiUrl;
  // const projects = config.Criteria.Projects;
  // const issueTypes = config.Criteria.IssueTypes;
  // const filters = config.Criteria.Filters;
  // const workflow = config.Workflow;
  // const attributes = config.Attributes;
  // const username = config.Connection.Username;
  // const password = config.Connection.Password;
  // const startDate = config.Criteria.StartDate;
  // const endDate = config.Criteria.EndDate;
  // const customJql = config.Criteria.CustomJql;
  // const oauth = config.Connection.OAuth;
  const { apiUrl, projects, issueTypes, filters, workflow, attributes, startDate, endDate, customJql, username, password, oauth} = destructureConfig(config);

  const metadata = await getMetadata({
    apiRootUrl: apiUrl,
    projects,
    issueTypes,
    filters,
    workflow,
    startDate,
    endDate,
    customJql,
    startIndex: 0,
    batchSize: 1,
    username,
    password,
    oauth});

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
  const customJql = config.Criteria.CustomJql;
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

const convertIssuesToWorkItems = function(issues: IIssue[], workflow, attributes: any): IWorkItem[] {
  const workItems = issues.map(issue => convertIssueToWorkItem(issue, workflow, attributes)); 
  return workItems;
};

const convertIssueToWorkItem = (issue: IIssue, workflow: {}, attributes: {} = {}): IWorkItem => {
  const key: string = issue.key;
  const name: string = issue.fields['summary'];
  const stagingDates: string[] = getStagingDates(issue, workflow);
  const type: string = issue.fields.issuetype.name ? issue.fields.issuetype.name : '';
  const requestedAttributeSystemNames: string[] = Object.keys(attributes).map(key => attributes[key]);
  const attributesKeyVal: {} = getAttributes(issue.fields, requestedAttributeSystemNames);
  const workItem: WorkItem = new WorkItem(key, stagingDates, name, type, attributesKeyVal);
  return workItem;
};


export {
  extractBatchFromConfig,
  extractAllFromConfig,
};
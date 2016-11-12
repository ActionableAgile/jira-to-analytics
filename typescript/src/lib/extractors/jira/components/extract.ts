import { getIssues, getMetadata } from './jira-adapter';
import { IWorkItem } from '../../../core/types';
import { IJiraExtractorConfig, IIssue } from '../types';
import { WorkItem } from'../../../core/work-item';
import { getStagingDates } from './staging-parser';
import { getAttributes } from './attribute-parser';

const extractBatchFromConfig = async function(config: IJiraExtractorConfig, startIndex: number = 0, batchSize: number = 1) {
  // const { apiUrl, projects, issueTypes, filters, workflow, attributes, startDate, endDate, customJql, username, password, oauth} = destructureConfig(config);
  // const apiRootUrl = apiUrl;
  const issues = await getIssues(config, startIndex, batchSize);
  const workItems = issues.map(issue => convertIssueToWorkItem(issue, config.workflow, config.attributes));
  return workItems;
}

const extractAllFromConfig = async function(config: IJiraExtractorConfig, batchSize: number = 25, hook: Function = () => {}) {

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
  // const { apiUrl, projects, issueTypes, filters, workflow, attributes, startDate, endDate, customJql, username, password, oauth} = destructureConfig(config);

  // const merged = Object.assign({}, config, {
  //   apiRootUrl: config.connection.url,
  //   batchSize: 1,
  //   startIndex: 0,
  //   username: config.connection.auth.username,
  //   password: config.connection.auth.password,
  //   oauth: config.connection.auth.username,

  // });

  const metadata = await getMetadata(config);

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

  if (config.featureFlags) {
    if (config.featureFlags['MaskName']) {
      allWorkItems.forEach(workItem => {
        delete workItem.Name;
        workItem.Name = '';
      });
    }
  }

  return allWorkItems;
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
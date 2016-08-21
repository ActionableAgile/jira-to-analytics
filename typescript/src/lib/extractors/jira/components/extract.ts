import { getIssues, getMetadata } from './jira-adapter';
import { convertIssueToWorkItem } from './work-item-adapter';

const extractBatchFromConfig = async function(config: IJiraSettings, startIndex: number = 0, batchSize: number = 0) {
    const { apiUrl, projects, issueTypes, filters, workflow, attributes, startDate, endDate, customJql, username, password}  = destructureConfig(config);
    const issues = await getIssues(apiUrl, projects, issueTypes, filters, workflow, startDate, endDate, customJql, startIndex, batchSize, username, password);
    return issues.map(issue => convertIssueToWorkItem(issue, workflow, attributes));
}

const extractAllFromConfig = async function(config: IJiraSettings, batchSize: number = 25, hook: Function = () => {}) {
  const { apiUrl, projects, issueTypes, filters, workflow, attributes, startDate, endDate, customJql, username, password}  = destructureConfig(config);
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
    password);

  const totalJiras: number = metadata.total; 
  const actualBatchSize = batchSize ? batchSize : totalJiras;
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

  return allWorkItems;
};

// Disabled these functions...code smell passing in too many parameters, just using a config obj instead (type IJiraSettings)
// const extractBatch = async function(
//   apiUrl: string, 
//   projects: string[], 
//   issueTypes: string[], 
//   filters: string[], 
//   workflowKeyVal: {}, 
//   attributesKeyVal: {}, 
//   startDate,
//   endDate,
//   customJql,
//   username?: string, 
//   password?: string, 
//   startIndex: number = 0, 
//   batchSize: number = 1) {
  
//   const issues = await getIssues(apiUrl, projects, issueTypes, filters, workflowKeyVal, startDate, endDate, customJql, startIndex, batchSize, username, password);
//   return issues.map(issue => convertIssueToWorkItem(issue, workflowKeyVal, attributesKeyVal));
// };
// 
// const extractAll = async function(
//   apiUrl, 
//   projects, 
//   issueTypes, 
//   filters, 
//   workflow, 
//   attributes,
//   startDate, 
//   endDate, 
//   customJql,
//   batchSize: number = 25, 
//   hook: Function = () => {}, 
//   username, 
//   password) {

//   const metadata = await getMetadata(
//     apiUrl, 
//     projects, 
//     issueTypes, 
//     filters, 
//     workflow, 
//     startDate,
//     endDate,
//     customJql,
//     0, 
//     1, 
//     username, 
//     password);

//   const totalJiras: number = metadata.total; 
//   const actualBatchSize = batchSize ? batchSize : totalJiras;
//   const totalBatches: number = Math.ceil(totalJiras / batchSize); 

//   hook(0);

//   const allWorkItems: IWorkItem[] = [];
//   for (let i = 0; i < totalBatches; i++) {
//     const start = i * actualBatchSize;
//     const workItemBatch = await extractBatch(
//       apiUrl, 
//       projects, 
//       issueTypes, 
//       filters, 
//       workflow, 
//       attributes,
//       startDate,
//       endDate,
//       customJql,
//       username, 
//       password, 
//       start, 
//       batchSize);

//     allWorkItems.push(...workItemBatch);
//     hook(Math.max(actualBatchSize / totalJiras) * 100);
//   }

//   hook(100);

//   return allWorkItems;
// };

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

  return {
    apiUrl, projects, issueTypes, filters, workflow, attributes, username, password, startDate, endDate, customJql,
  };
};

export {
  extractBatchFromConfig,
  extractAllFromConfig,
};
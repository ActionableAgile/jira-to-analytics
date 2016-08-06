// import { JiraSettings } from './settings'
// import { 
//   buildJiraSearchQueryUrl, 
//   buildJiraGetProjectsUrl,
//   buildJiraGetWorkflowsUrl } from './components/query-builder';
// import { getAttributes } from './components/attribute-parser';
// import { WorkItem } from '../../core/work-item';
// import { getJsonFromUrl, getHeaders } from '../../core/http';
// import { getStagingDates } from './components/staging-parser';

// class JiraExtractor {
//   private settings: IJiraSettings;
//   private statusHook: any;
//   private workItems: Array<IWorkItem>;

//   constructor(settings: IJiraSettings, statusHook: Function = () => {}) {
//     if (!settings) {
//       throw new Error('No JIRA Settings found. Must provide settings');
//     }
//     this.settings = settings;
//     this.statusHook = statusHook;
//   };

//   // testConnection = async function(settings: IJiraSettings) {
//   //   const url = buildJiraGetProjectsUrl(settings.ApiUrl);
//   //   const headers: Headers = getHeaders(settings.Connection.Username, settings.Connection.Password);
//   //   const projects: any[] = await getJsonFromUrl(url, headers);
//   //   return projects.length ? true : false;
//   // };

//   // getProjects = async function(settings: IJiraSettings) {
//   //   const url = buildJiraGetProjectsUrl(settings.ApiUrl);
//   //   const headers: Headers = getHeaders(settings.Connection.Username, settings.Connection.Password);
//   //   const projects: any[] = await getJsonFromUrl(url, headers);
//   //   return projects;
//   // }

//   // getWorkflows = async function(project: string, settings: IJiraSettings) {
//   //   const url = buildJiraGetWorkflowsUrl(project, settings.ApiUrl);
//   //   const headers: Headers = getHeaders(settings.Connection.Username, settings.Connection.Password);
//   //   const workflows: any[] = await getJsonFromUrl(url, headers);    
//   //   return workflows;
//   // }

//   getWorkItems(): Promise<any> {
//     return new Promise((accept, reject) => {
//       this.getAllWorkItemsFromJiraApi(this.settings, this.statusHook)
//       .then(items => {
//         this.workItems = items;
//         accept(items);
//       }).catch(err => {
//         reject(err);
//       });
//     });
//   };

//   getWorkItemMetadata = async function(settings: IJiraSettings): Promise<any> {
//     const metadata = await getJsonFromUrl(
//         buildJiraSearchQueryUrl(
//           settings.ApiUrl, 
//           settings.Criteria.Projects, 
//           settings.Criteria.IssueTypes, 
//           settings.Criteria.Filters), 
//         getHeaders(settings.Connection.Username, settings.Connection.Password)
//     );
//     return metadata;
//   };

//   toCSV(workItems = this.workItems, stages = this.settings.Stages, attributes = this.settings.Attributes): string {
//     const header = `ID,Link,Name,${stages.join(',')},Type,${Object.keys(attributes).join(',')}`;
//     const body = workItems.map(item => item.toCSV()).reduce((res, cur) => `${res + cur}\n`, '');
//     const csv = `${header}\n${body}`;
//     return csv;
//   };

//   toSerializedArray(workItems = this.workItems, stages = this.settings.Stages, attributes = this.settings.Attributes): string {
//     const header = `["ID","Link","Name",${stages.map(stage => `"${stage}"`).join(',')},"Type",${Object.keys(attributes).map(attribute => `"${attribute}"`).join(',')}]`;
//     const body = workItems.map(item => item.toSerializedArray()).reduce((res, cur) => `${res},\n${cur}`, '');
//     const serializedData: string = `[${header}${body}]`;
//     return serializedData;
//   };

//   getIssues = async function(query: string, username: string, password: string): Promise<IIssue[]> {
//     const headers: Headers = getHeaders(username, password);
//     const result: IIssueList = await getJsonFromUrl(query, headers);
//     if (result.issues) {
//         const issues: IIssue[] = result.issues;
//         return issues;
//     } else {
//         throw new Error('Could not retrieve issues from object');
//     }
//   };

//   createWorkItem(issue: IIssue, settings: IJiraSettings): IWorkItem {
//     const key: string = issue.key;
//     const name: string = issue.fields['summary'];
//     // refactor this one
//     const stagingDates = getStagingDates(issue, settings.Stages, settings.StageMap, settings.CreateInFirstStage, settings.ResolvedInLastStage);
//     const type = issue.fields.issuetype.name ? issue.fields.issuetype.name : '';

//     const requestedAttributeSystemNames: string[] = Object.keys(settings.Attributes).map(key => settings.Attributes[key]);
//     const attributes = getAttributes(issue.fields, requestedAttributeSystemNames);

//     const workItem = new WorkItem(key, stagingDates, name, type, attributes);
//     return workItem;
//   };

//   getWorkItemsBatch = async function(start: number, batchSize: number, settings: IJiraSettings): Promise<IWorkItem[]> {
    // const url = buildJiraSearchQueryUrl(
    //   settings.ApiUrl, 
    //   settings.Criteria.Projects, 
    //   settings.Criteria.IssueTypes, 
    //   settings.Criteria.Filters, 
    //   start, 
    //   batchSize
    // );
    // const issues = await this.getIssues(url, settings.Connection.Username, settings.Connection.Password);
    // const workItems = issues.map(issue => this.createWorkItem(issue, settings));
    // return workItems;
//   };

//   getAllWorkItemsFromJiraApi = async function(settings: IJiraSettings, hook: any = () => {}, resultsPerBatch = 25): Promise<IWorkItem[]> {
//     const metadata = await this.getWorkItemMetadata(settings);
//     const totalJiras: number = metadata.total; 
//     const batchSize: number = resultsPerBatch;
//     const totalBatches: number = Math.ceil(totalJiras / batchSize); 

//     const allWorkItems: IWorkItem[] = [];
//     hook(0);
//     for  (let i = 0; i < totalBatches; i++) {
//       const workItemBatch = await this.getWorkItemsBatch(i * batchSize, batchSize, settings);
//       allWorkItems.push(...workItemBatch);
//       hook(Math.max(batchSize / totalJiras)*100);
//     }
//     hook(100);

//     return allWorkItems;
//   };
// };

// export {
//   JiraExtractor,
//   JiraSettings,
// };

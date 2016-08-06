import { JiraSettings } from './settings'
import { toCSV, toSerializedArray } from './components/exporter';
import { buildJiraSearchQueryUrl } from './components/query-builder';
import { getIssues, getMetadata, testConnection, getProjects, getWorkflows } from './components/jira-adapter';
import { convertIssueToWorkItem } from './components/work-item-adapter';

class JiraExtractor {

  constructor() {};

  getWorkItemBatched = async function(
    url, stages, stageMap, createInFirstStage, resolvedInLastStage, attributes, username?, password?, 
    startIndex: number = 0, batchSize: number = 1) {
    
    const issues = await this.getIssues(url, username, password);
    return issues.map(issue => convertIssueToWorkItem(
      issue, stages, stageMap, createInFirstStage, resolvedInLastStage, attributes));
  };

  getWorkItems = async function(settings: IJiraSettings, hook: Function = () => {}) {
    const resultsPerBatch = 25;
    const metaDataUrl = buildJiraSearchQueryUrl(settings.ApiUrl, settings.Criteria.Projects, settings.Criteria.IssueTypes, settings.Criteria.Filters)
    const metadata = await getMetadata(metaDataUrl, settings.Connection.Username, settings.Connection.Password);

    const totalJiras: number = metadata.total; 
    const batchSize: number = resultsPerBatch;
    const totalBatches: number = Math.ceil(totalJiras / batchSize); 

    const allWorkItems: IWorkItem[] = [];

    hook(0);
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const url = buildJiraSearchQueryUrl(
        settings.ApiUrl, 
        settings.Criteria.Projects, 
        settings.Criteria.IssueTypes, 
        settings.Criteria.Filters, 
        start, 
        batchSize
      );

      const workItemBatch = await this.getWorkItemBatched(
        url, settings.Stages, settings.StageMap, settings.CreateInFirstStage, settings.ResolvedInLastStage, settings.Attributes,
        settings.Connection.Username, settings.Connection.Password, start, batchSize);
      
      allWorkItems.push(...workItemBatch);

      hook(Math.max(batchSize / totalJiras) * 100);
    }
    hook(100);
    return allWorkItems;
  };

  testConnection = testConnection;
  getProjects = getProjects;
  getWorkflows = getWorkflows;
  getIssues = getIssues;

  toSerializedArray = toSerializedArray;
  toCSV = toCSV;
};

export {
  JiraExtractor,
  JiraSettings,
};

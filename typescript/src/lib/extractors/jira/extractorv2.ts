import { JiraSettings } from './settings'
import { toCSV, toSerializedArray } from './components/exporter';
import {
  getIssues,
  testConnection,
  getProjects,
  getWorkflows
} from './components/jira-adapter';
import { 
  createWorkItem,
  getWorkItemsBatch,
  getAllWorkItemsFromJiraApi,
  getWorkItems,
  getWorkItemMetadata,
} from './components/workitem-adapter';

class JiraExtractor {
  constructor() {};

  testConnection = testConnection;
  getProjects = getProjects;
  getWorkflows = getWorkflows;
  getworkItems = getWorkItems;
  getWorkItemMetaData = getWorkItemMetadata;

  createWorkItem = createWorkItem;
  getWorkItemsBatch = getWorkItemsBatch;
  getAllWorkItemsFromJiraApi = getAllWorkItemsFromJiraApi;
  
  toCSV = toCSV;
  toSerializedArray = toSerializedArray;
};

export {
  JiraExtractor,
  JiraSettings,
};

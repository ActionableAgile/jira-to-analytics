import { JiraSettings } from './settings'
import { toCSV, toSerializedArray } from './components/exporter';
import {
  getIssues,
  testConnection,
  getProjects,
  getWorkflows
} from './components/jira-adapter';
import { 
  getWorkItemsBatch,
  getAllWorkItemsFromJiraApi,
  getWorkItems,
  getWorkItemMetadata,
} from './components/work-item-adapter';

class JiraExtractor {
  // constructor() {};
  settings;
  statusHook;

  constructor(settings: IJiraSettings, statusHook: Function = () => {}) {
    if (!settings) {
      throw new Error('No JIRA Settings found. Must provide settings');
    }
    this.settings = settings;
    this.statusHook = statusHook;
  };

  getWorkItems = async function() {
    return getWorkItems(this.settings, this.statusHook);
  };

  testConnection = testConnection;
  getProjects = getProjects;
  getWorkflows = getWorkflows;
  getIssues = getIssues;

  // getWorkItems = getWorkItems;
  getWorkItemMetaData = getWorkItemMetadata;
  getWorkItemsBatch = getWorkItemsBatch;
  getAllWorkItemsFromJiraApi = getAllWorkItemsFromJiraApi;
  
  toSerializedArray = toSerializedArray;
  toCSV = async function() {
    const workItems = await getWorkItems(this.settings, this.statusHook);
    const theSettings = <IJiraSettings>this.settings;
    return toCSV(workItems, theSettings.Stages, theSettings.Attributes);
  }
};

export {
  JiraExtractor,
  JiraSettings,
};

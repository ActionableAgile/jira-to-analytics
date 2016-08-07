import { toCSV, toSerializedArray } from './components/exporter';
import { getIssues, getMetadata, testConnection, getProjects, getWorkflows } from './components/jira-adapter';
import { extractBatch, extractAll } from './components/extract';
import { importConfig } from './components/import-config';

class JiraExtractor {
  config: IJiraSettings = null;
  batchSize: number;

  constructor(config?: IJiraSettings) {
    this.config = config;
  };

  setConfig(c: IJiraSettings) {
    this.config = c;
    return this;
  };

  setBatchSize(x: number) {
    this.batchSize = x;
    return this;
  };

  importSettings(configObjToImport, source) {
    const config = importConfig(configObjToImport, source);
    this.setConfig(config);
    return this;
  };

  extractAll = async function(statusHook?) {
    const batchSize = this.batchSize || 25;
    const hook = statusHook || (() => {});

    const { apiUrl, projects, issueTypes, filters, workflow, attributes, username, password } = this.destructureConfig(this.config);
    return extractAll(apiUrl, projects, issueTypes, filters, workflow, attributes, batchSize, hook, username, password);
  };

  extractBatch = async function(batchSize?, startIndex = 0) {
    const { apiUrl, projects, issueTypes, filters, workflow, attributes, username, password, } = this.destructureConfig(this.config);
    return extractBatch(apiUrl, projects, issueTypes, filters, workflow, attributes, username, password, startIndex, batchSize);
  };

  private destructureConfig(config: IJiraSettings) {
    const apiUrl = this.config.Connection.ApiUrl;
    const projects = this.config.Criteria.Projects;
    const issueTypes = this.config.Criteria.IssueTypes;
    const filters = this.config.Criteria.Filters;
    const workflow = this.config.Workflow;
    const attributes = this.config.Attributes;
    const username = this.config.Connection.Username;
    const password = this.config.Connection.Password;

    return {
      apiUrl, projects, issueTypes, filters, workflow, attributes, username, password,
    };
  };
  toCSV(workItems, withHeader?) {
    return toCSV(workItems, Object.keys(this.config.Workflow), this.config.Attributes, withHeader);
  };

  toSerializedArray(workItems, withHeader?) {
    return toSerializedArray(workItems, Object.keys(this.config.Workflow), this.config.Attributes, withHeader);
  };

  testConnection = testConnection;
  getProjects = getProjects;
  getWorkflows = getWorkflows;
  getIssues = getIssues;
  getMetadata = getMetadata;
};

export {
  JiraExtractor,
};

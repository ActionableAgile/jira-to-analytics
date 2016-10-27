import { toCSV, toSerializedArray } from './components/exporter';
import { extractBatchFromConfig, extractAllFromConfig } from './components/extract';
import { importConfig } from './components/import-config';
import { IWorkItem } from '../../core/types';
import { IJiraSettings} from './types';


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
    return extractAllFromConfig(this.config, batchSize, hook);
  };

  extractBatch = async function(batchSize?, startIndex = 0) {
    return extractBatchFromConfig(this.config, startIndex, batchSize);
  };

  toCSV(workItems, withHeader?) {
    return toCSV(workItems, Object.keys(this.config.Workflow), this.config.Attributes, this.config.Connection.Domain, withHeader);
  };

  toSerializedArray(workItems, withHeader?) {
    return toSerializedArray(workItems, Object.keys(this.config.Workflow), this.config.Attributes, withHeader);
  };

  // testConnection = testConnection;
  // getProjects = getProjects;
  // getWorkflows = getWorkflows;
  // getIssues = getIssues;
  // getMetadata = getMetadata;
};

export {
  JiraExtractor,
};

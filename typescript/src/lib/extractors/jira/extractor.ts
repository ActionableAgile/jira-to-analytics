import { IWorkItem } from '../../core/types';
import { IJiraExtractorConfig, IIssue } from './types';
import { convertYamlToJiraSettings, convertYamlToNewJiraConfig } from './components/yaml-converter';
import { getIssues, getMetadata } from './components/jira-adapter';
import { WorkItem } from'../../core/work-item';
import { getStagingDates } from './components/staging-parser';
import { getAttributes } from './components/attribute-parser';

class JiraExtractor {
  config: IJiraExtractorConfig = {};

  setBatchSize(x: number) {
    this.config.batchSize = x;
    return this;
  };

  importSettings(configObjToImport, source) {
    switch (source.toUpperCase()) {
      case 'YAML':
        const yamlOld = convertYamlToJiraSettings(configObjToImport)
        const parsedSettings = convertYamlToNewJiraConfig(yamlOld);
        this.config = parsedSettings;
        return this;
      default:
        throw new Error(`${source} source not found`);
    }
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
    let attributes = this.config.attributes;
    let stages = Object.keys(this.config.workflow);
    let domainUrl = this.config.connection.url;
    let config = this.config;

    if (attributes === undefined || attributes === null) {
      attributes = {};
    }
    const header = `ID,Link,Name,${stages.join(',')},Type,${Object.keys(attributes).join(',')}`;
    const body = workItems.map(item => item.toCSV(domainUrl, config)).reduce((res, cur) => `${res + cur}\n`, '');
    const csv: string = `${header}\n${body}`;
    return csv;
  };

  toSerializedArray(workItems, withHeader?) {
    let stages = Object.keys(this.config.workflow);
    let attributes = this.config.attributes;

    const header = `["ID","Link","Name",${stages.map(stage => `"${stage}"`).join(',')},"Type",${Object.keys(attributes).map(attribute => `"${attribute}"`).join(',')}]`;
    const body = workItems.map(item => item.toSerializedArray()).reduce((res, cur) => `${res},\n${cur}`, '');
    const serializedData: string = `[${header}${body}]`;
    return serializedData;
  };
};

const extractBatchFromConfig = async (config: IJiraExtractorConfig, startIndex: number = 0, batchSize: number = 1) => {
  const issues = await getIssues(config, startIndex, batchSize);
  const workItems = issues.map(issue => {
    return convertIssueToWorkItem(issue, config.workflow, config.attributes) 
  });
  return workItems;
};

const extractAllFromConfig = async (config: IJiraExtractorConfig, batchSize: number = 25, hook: Function = () => {}) => {
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

  if (config.featureFlags && config.featureFlags['MaskName']) {
    allWorkItems.forEach(workItem => {
      delete workItem.Name;
      workItem.Name = '';
    });
  }
  return allWorkItems;
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
  JiraExtractor,
};


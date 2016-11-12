import { IWorkItem } from '../../core/types';
import { IJiraExtractorConfig, IIssue } from './types';
import { convertYamlToJiraSettings } from './components/yaml-converter';
import { getIssues, getMetadata } from './components/jira-adapter';
import { WorkItem } from'../../core/work-item';
import { getStagingDates } from './components/staging-parser';
import { getAttributes } from './components/attribute-parser';

const _convertIssueToWorkItem = (issue: IIssue, workflow: {}, attributes: {} = {}): IWorkItem => {
  const key: string = issue.key;
  const name: string = issue.fields['summary'];
  const stagingDates: string[] = getStagingDates(issue, workflow);
  const type: string = issue.fields.issuetype.name ? issue.fields.issuetype.name : '';
  const requestedAttributeSystemNames: string[] = Object.keys(attributes).map(key => attributes[key]);
  const attributesKeyVal: {} = getAttributes(issue.fields, requestedAttributeSystemNames);
  const workItem: WorkItem = new WorkItem(key, stagingDates, name, type, attributesKeyVal);
  return workItem;
};

class JiraExtractor {
  config: IJiraExtractorConfig = {};

  setBatchSize(x: number) {
    this.config.batchSize = x;
    return this;
  };

  importSettings(configObjToImport, source) {
    switch (source.toUpperCase()) {
      case 'YAML':
        const parsedSettings = convertYamlToJiraSettings(configObjToImport);
        this.config = parsedSettings;
        return this;
      default:
        throw new Error(`${source} source not found, cannot import config`);
    }
  };

  extractAll = async function(statusHook?) {
    const config = this.config;
    const batchSize = this.batchSize || 25;
    const hook = statusHook || (() => null);

    const metadata = await getMetadata(config);

    const totalJiras: number = metadata.total;
    const actualBatchSize: number = batchSize ? batchSize : totalJiras;
    const totalBatches: number = Math.ceil(totalJiras / batchSize);

    hook(0);
    const allWorkItems: IWorkItem[] = [];
    for (let i = 0; i < totalBatches; i++) {
      const start = i * actualBatchSize;

      const issues = await getIssues(config, start, batchSize);
      const workItemBatch = issues.map(issue => _convertIssueToWorkItem(issue, config.workflow, config.attributes));
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

  extract = async function(opts: { startIndex?: number, batchSize?: number }) {
    const config = this.config;
    const { startIndex = 0, batchSize = 25 } = opts;

    const issues = await getIssues(config, startIndex, batchSize);
    const workItems = issues.map(issue => _convertIssueToWorkItem(issue, config.workflow, config.attributes));
    return workItems;
  };

  toCSV(workItems, withHeader: boolean = true) {
    let attributes = this.config.attributes || {};
    let stages = Object.keys(this.config.workflow);
    let domainUrl = this.config.connection.url;
    let config = this.config;

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

export {
  JiraExtractor,
};

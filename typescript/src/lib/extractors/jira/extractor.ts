import { IJiraExtractorConfig, IIssue, IWorkflow, IAttributes } from './types';
import { convertYamlToJiraSettings } from './components/yaml-converter';
import { getIssues, getMetadata } from './components/jira-adapter';
import { getStagingDates } from './components/staging-parser';
import { getAttributes } from './components/attribute-parser';
import { JiraWorkItem } from './components/jira-work-item';

const _convertIssueToWorkItem = (issue: IIssue, workflow: IWorkflow, attributes: IAttributes = {}): JiraWorkItem => {
  const key: string = issue.key;
  const name: string = issue.fields['summary'];
  const stagingDates: string[] = getStagingDates(issue, workflow);
  const type: string = issue.fields.issuetype.name ? issue.fields.issuetype.name : '';
  const requestedAttributeSystemNames: string[] = Object.keys(attributes).map(key => attributes[key]);
  const attributesKeyVal: {} = getAttributes(issue.fields, requestedAttributeSystemNames);
  const workItem: JiraWorkItem = new JiraWorkItem(key, stagingDates, name, type, attributesKeyVal);
  return workItem;
};

class JiraExtractor {
  config: IJiraExtractorConfig;

  constructor(config?: IJiraExtractorConfig) {
    this.config = config;
  }

  setBatchSize(x: number): this {
    this.config.batchSize = x;
    return this;
  };

  importSettingsFromYaml(configObjToImport): this {
    const parsedSettings = convertYamlToJiraSettings(configObjToImport);
    this.config = parsedSettings;
    return this;
  };

  beforeExtract() {
    const config = this.config;

    if (!config.connection.url || config.connection.url === '') {
      throw new Error('URL for extraction not set.');
    }

    if (!config.projects || config.projects.length < 1) {
      throw new Error('No project(s) detected in configuration.');
    }

    if (!config.issueTypes || config.issueTypes.length < 1) {
      throw new Error('No issue type(s) detected in configuration.');
    }
  };

  extractAll = async function(statusHook?): Promise<JiraWorkItem[]> {
    this.beforeExtract();
    const config: IJiraExtractorConfig = this.config;
    const batchSize = config.batchSize || 25;
    const hook = statusHook || (() => null);

    const metadata = await getMetadata(config);

    const totalJiras: number = metadata.total;
    const actualBatchSize: number = batchSize ? batchSize : totalJiras;
    const totalBatches: number = Math.ceil(totalJiras / batchSize);

    hook(0);
    const allWorkItems: JiraWorkItem[] = [];
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
        delete workItem.name;
        workItem.name = '';
      });
    }
    return allWorkItems;
  };

  extract = async function(opts: { startIndex?: number, batchSize?: number }): Promise<JiraWorkItem[]> {
    this.beforeExtract();
    const config = this.config;
    const { startIndex = 0, batchSize = 25 } = opts;

    const issues = await getIssues(config, startIndex, batchSize);
    const workItems = issues.map(issue => _convertIssueToWorkItem(issue, config.workflow, config.attributes));
    return workItems;
  };

  toCSV(workItems: JiraWorkItem[], withHeader: boolean = true) {
    let attributes = this.config.attributes || {};
    let stages = Object.keys(this.config.workflow);
    let config = this.config;

    const header = `ID,Link,Name,${stages.join(',')},Type,${Object.keys(attributes).join(',')}`;
    const body = workItems.map(item => item.toCSV(config)).reduce((res, cur) => `${res + cur}\n`, '');
    const csv: string = `${header}\n${body}`;
    return csv;
  };

  // toSerializedArray(workItems, withHeader?) {
  //   let stages = Object.keys(this.config.workflow);
  //   let attributes = this.config.attributes;
  //   const header = `["ID","Link","Name",${stages.map(stage => `"${stage}"`).join(',')},"Type",${Object.keys(attributes).map(attribute => `"${attribute}"`).join(',')}]`;
  //   const body = workItems.map(item => item.toSerializedArray()).reduce((res, cur) => `${res},\n${cur}`, '');
  //   const serializedData: string = `[${header}${body}]`;
  //   return serializedData;
  // };
};

export {
  JiraExtractor,
};

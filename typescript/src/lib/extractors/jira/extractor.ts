import { IJiraExtractorConfig, IIssue, IWorkflow, IAttributes, IIssueList } from './types';
import { convertYamlToJiraSettings } from './components/yaml-converter';
import { getStagingDates } from './components/staging-parser';
import { getAttributes } from './components/attribute-parser';
import { JiraWorkItem } from './components/jira-work-item';
import { buildJiraSearchQueryUrl } from './components/query-builder';
import { getJson } from './components/jira-adapter';

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

  afterExtract(workItems: Array<JiraWorkItem>) {
    const config = this.config;
    if (config.featureFlags && config.featureFlags['MaskName']) {
      workItems.forEach(workItem => {
        delete workItem.name;
        workItem.name = '';
      });
    }
    return workItems;
  }

  async extractAll(statusHook = (n) => null): Promise<JiraWorkItem[]> {
    this.beforeExtract();
    const config: IJiraExtractorConfig = this.config;
    const hook = statusHook;

    const batchSize = config.batchSize || 25;
    const totalJiras = await this.getTotalIssues();

    let actualBatchSize: number = batchSize;
    if (batchSize == 0) { // no batching limit
      actualBatchSize = totalJiras;
    }
    const totalBatches: number = Math.ceil(totalJiras / batchSize);
    const allWorkItems: JiraWorkItem[] = [];
    hook(0);
    for (let i = 0; i < totalBatches; i++) {
      const start: number = i * actualBatchSize;
      const issues = await this.getIssues({ startIndex: start, batchSize });
      const workItemBatch = issues.map(this.convertIssueToWorkItem);
      allWorkItems.push(...workItemBatch);
      hook(Math.max(actualBatchSize / totalJiras) * 100);
    }
    hook(100);
    this.afterExtract(allWorkItems); // mutation
    return allWorkItems;
  };

  async extract(opts: { startIndex?: number, batchSize?: number }): Promise<JiraWorkItem[]> {
    this.beforeExtract();
    const { startIndex = 0, batchSize = 25 } = opts;

    const issues = await this.getIssues({ startIndex, batchSize });
    const workItems = issues.map(this.convertIssueToWorkItem);
    this.afterExtract(workItems); // mutation
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

  private async requestJson({ startIndex = 0, batchSize = 25 }) {
    const config = this.config;
    const queryUrl: string = buildJiraSearchQueryUrl(
      { apiRootUrl: config.connection.url,
        projects: config.projects,
        issueTypes: config.issueTypes,
        filters: config.filters,
        startDate: config.startDate,
        endDate: config.endDate,
        customJql: config.customJql,
        startIndex,
        batchSize
      }
    );
    const result: IIssueList = await getJson(queryUrl, config.connection.auth);
    return result;
  }

  private async getTotalIssues(): Promise<number> {
    const metadata = await this.requestJson({ batchSize: 1, startIndex: 0});
    const totalJiras: number = metadata.total;
    return totalJiras;
  }

  private async getIssues({ startIndex, batchSize }) {
    const json = await this.requestJson({ startIndex, batchSize });
    if (json.issues) {
      const issues: IIssue[] = json.issues;
      return issues;
    } else {
      throw new Error('Could not retrieve issues from object');
    }
  };

  private convertIssueToWorkItem = (issue: IIssue): JiraWorkItem => {
    const workflow = this.config.workflow;
    const attributes = this.config.attributes;
    const key: string = issue.key;
    const name: string = issue.fields['summary'];
    const stagingDates: string[] = getStagingDates(issue, workflow);
    const type: string = issue.fields.issuetype.name ? issue.fields.issuetype.name : '';

    let attributesKeyVal = null;
    if (attributes) {
      const requestedAttributeSystemNames: string[] = Object.keys(attributes).map(key => attributes[key]);
      attributesKeyVal = getAttributes(issue.fields, requestedAttributeSystemNames);
    }

    const workItem: JiraWorkItem = new JiraWorkItem(key, stagingDates, name, type, attributesKeyVal);
    return workItem;
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

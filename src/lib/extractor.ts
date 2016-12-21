import { IJiraExtractorConfig, IJiraApiIssue, IJiraApiWorkflow, IJiraApiError, IJiraApiIssueList } from './types';
import { buildJiraSearchQueryUrl, buildJiraGetProjectsUrl, buildJiraGetWorkflowsUrl } from './components/query-builder';
import { getStagingDates } from './components/staging-parser';
import { getAttributes } from './components/attribute-parser';
import { JiraWorkItem } from './components/jira-work-item';
import { getJson } from './components/jira-adapter';

class JiraExtractor {
  config: IJiraExtractorConfig;

  constructor(config: IJiraExtractorConfig) {
    if (!config) {
      throw new Error('Configuation null. Configuration must be provided to use JiraExtrator.');
    }

    if (!config.connection || !config.connection.url) {
      throw new Error('Error, Jira API Url not set in configuration. API Url is required.');
    }
    this.config = config;
    this.config.batchSize = 25;
  }

  async testConnection(): Promise<boolean> {
    const url = buildJiraGetProjectsUrl(this.config.connection.url);
    try {
      await getJson(url, this.config.connection.auth);
      return true;
    } catch (err) {
      return false;
    }
  }

  async getWorkflow(project: string) {
    const url = buildJiraGetWorkflowsUrl(project, this.config.connection.url);
    const workflow: Array<IJiraApiWorkflow> & IJiraApiError = await getJson(url, this.config.connection.auth);
    if (workflow.errorMessages) {
      throw new Error(workflow.errorMessages.toString());
    }
    return workflow.map(workflowType => {
      const workflowTypeName = workflowType.name; // 'Bug' or 'Story' for example
      const workflowSteps = workflowType.statuses.map(status => status.name); // ['Backlog, Anaylsis, Dev, Test, Done, etc..];
      return {
        name: workflowTypeName,
        statuses: workflowSteps,
      };
    });
  }

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

  async extractAll(statusHook = ((n: number) => null), debug: boolean = false): Promise<JiraWorkItem[]> {
    const config: IJiraExtractorConfig = this.config;
    const hook = statusHook;

    if (!config.connection.url || config.connection.url === '') {
      throw new Error('URL for extraction not set.');
    }

    const batchSize = config.batchSize || 25;
    const totalJiras = await this.getIssueCountFromJiraApi();

    let actualBatchSize: number = batchSize;
    if (batchSize == 0) { // no batching limit
      actualBatchSize = totalJiras;
    }
    const totalBatches: number = Math.ceil(totalJiras / batchSize);
    const allWorkItems: JiraWorkItem[] = [];
    hook(0);
    for (let i = 0; i < totalBatches; i++) {
      const start: number = i * actualBatchSize;
      const issues = await this.getIssuesFromJiraApi({ startIndex: start, batchSize });
      const workItemBatch = issues.map(this.convertIssueToWorkItem);
      allWorkItems.push(...workItemBatch);
      hook(Math.max(actualBatchSize / totalJiras) * 100);
    }
    hook(100);
    this.afterExtract(allWorkItems); // mutation
    return allWorkItems;
  };

  async extract(opts: { startIndex?: number, batchSize?: number }): Promise<JiraWorkItem[]> {
    if (!this.config.connection.url || this.config.connection.url === '') {
      throw new Error('URL for extraction not set.');
    }
    const { startIndex = 0, batchSize = 25 } = opts;

    const issues = await this.getIssuesFromJiraApi({ startIndex, batchSize });
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

  private buildQuery({ startIndex = 0, batchSize = 25 }): string {
    const config = this.config;
    const queryUrl: string = buildJiraSearchQueryUrl(
      {
        apiRootUrl: config.connection.url,
        projects: config.projects,
        issueTypes: config.issueTypes,
        filters: config.filters,
        startDate: config.startDate,
        endDate: config.endDate,
        customJql: config.customJql,
        startIndex,
        batchSize,
      }
    );   
    return queryUrl;
  }

  private async getIssueCountFromJiraApi(): Promise<number> {
    const queryUrl = this.buildQuery({ batchSize: 1, startIndex: 0 });
    const metadata = await getJson(queryUrl, this.config.connection.auth);
    const totalJiras: number = metadata.total;
    return totalJiras;
  }

  private async getIssuesFromJiraApi({ startIndex, batchSize }) {
    const queryUrl = this.buildQuery({ startIndex, batchSize });
    const json: IJiraApiIssueList = await getJson(queryUrl, this.config.connection.auth);
    if (json.issues) {
      const issues: IJiraApiIssue[] = json.issues;
      return issues;
    } else {
      throw new Error('Could not retrieve issues from object');
    }
  };

  private convertIssueToWorkItem = (issue: IJiraApiIssue): JiraWorkItem => {
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

};

export {
  JiraExtractor,
};

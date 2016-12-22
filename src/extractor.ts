import { getStagingDates } from './components/staging-parser';
import { getAttributes } from './components/attribute-parser';
import { JiraWorkItem } from './components/jira-work-item';
import { getJson } from './components/jira-adapter';
import {
  buildJiraSearchQueryUrl,
  buildJiraGetProjectsUrl,
  buildJiraGetWorkflowsUrl,
  buildJQL,
} from './components/query-builder';
import {
  JiraExtractorConfig,
  JiraApiIssue,
  JiraApiWorkflow,
  JiraApiError,
  JiraApiIssueQueryResponse,
  Auth,
} from './types';

class JiraExtractor {
  config: JiraExtractorConfig;

  constructor(config: JiraExtractorConfig) {
    this.config = config;
    this.config.batchSize = 25; // todo: make configurable
  }

  async testConnection(): Promise<boolean> {
    const url = buildJiraGetProjectsUrl(this.config.connection.url);
    try {
      await getJson(url, this.config.connection.auth);
    } catch (err) {
      return false;
    }
    return true;
  }

  // Validates configuration before running extraction procedure(s)
  // If this function passes, it should imply a valid configuration setup
  async validate(): Promise<boolean> {
    const apiRootUrl = this.config.connection.url;
    if (!apiRootUrl) {
      throw new Error('URL for extraction not set.');
    }
    const isValidAuth = await this.testConnection();
    if (!isValidAuth) {
      throw new Error('Could not authenticate provided credentials.');
    }
    const jql = this.getJQL();
    const queryUrl: string = this.getJiraIssuesQueryUrl(jql);

    const testResponse: JiraApiIssueQueryResponse = await getJson(queryUrl, this.config.connection.auth);
    if (testResponse.errorMessages) {
      throw new Error(testResponse.errorMessages.join('\n'));
    }
    if (!testResponse.total) {
      throw new Error(`Error calling JIRA API at the following url:\n${queryUrl}\n using JQL: ${jql}`);
    }
    return true;
  }

  async extractAll(statusHook = ((n: number) => null), debug: boolean = false): Promise<JiraWorkItem[]> {
    await this.validate();

    const config: JiraExtractorConfig = this.config;
    const hook = statusHook;
    const apiRootUrl: string = config.connection.url;
    const auth: Auth = config.connection.auth;
    const batchSize: number = config.batchSize || 25;
    const jql: string = this.getJQL();

    if (debug) {
      console.log(`Using the following JQL for extracting:\n${jql}\n`);
    }

    const metadataQueryUrl: string = this.getJiraIssuesQueryUrl(jql);
    const metadata: JiraApiIssueQueryResponse = await getJson(metadataQueryUrl, auth);
    const totalJiraCount: number = metadata.total;
    if (totalJiraCount === 0) {
      throw new Error(`No stories found under search conditions using the following JQL:
        ${jql}
        Please check your configuration.`);
    }
    const actualBatchSize: number = batchSize === 0 ? totalJiraCount : batchSize;
    const totalBatches: number = Math.ceil(totalJiraCount / batchSize);
    const jiraWorkItemsAccumulator: JiraWorkItem[] = [];

    hook(0);
    for (let i = 0; i < totalBatches; i++) {
      const start: number = i * actualBatchSize;
      const issues: JiraApiIssue[] = await this.getIssuesFromJira(jql, start, actualBatchSize);
      const workItemBatch = issues.map(this.convertIssueToWorkItem);
      jiraWorkItemsAccumulator.push(...workItemBatch);
      hook(Math.max(actualBatchSize / totalJiraCount) * 100);
    }
    hook(100);

    // Privacy filters...hides name.
    if (config.featureFlags && config.featureFlags['MaskName']) {
      jiraWorkItemsAccumulator.map(workItem => Object.assign({}, workItem, { name: '' }));
    }
    return jiraWorkItemsAccumulator;
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

  private async getIssuesFromJira(jql, startIndex, batchSize): Promise<JiraApiIssue[]> {
    const queryUrl = this.getJiraIssuesQueryUrl(jql, startIndex, batchSize);
    const auth = this.config.connection.auth;
    const json: JiraApiIssueQueryResponse = await getJson(queryUrl, auth);
    if (!json.issues) {
      throw new Error('Could not retrieve issues from object');
    }
    return json.issues;
  }

  private getJiraIssuesQueryUrl(jql: string, startIndex: number = 0, batchSize: number = 1): string {
    const apiRootUrl = this.config.connection.url;
    const queryUrl: string = buildJiraSearchQueryUrl(
      {
        apiRootUrl,
        jql,
        startIndex: 0,
        batchSize: 1,
      });
    return queryUrl;
  }

  private getJQL(): string {
    const { projects, issueTypes, filters, startDate, endDate, customJql } = this.config;
    const jql: string = buildJQL(
      {
        projects,
        issueTypes,
        filters,
        startDate,
        endDate,
        customJql,
      },
    );
    return jql;
  }

  private convertIssueToWorkItem = (issue: JiraApiIssue): JiraWorkItem => {
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
    return new JiraWorkItem(key, stagingDates, name, type, attributesKeyVal);
  };
};

export {
  JiraExtractor,
};

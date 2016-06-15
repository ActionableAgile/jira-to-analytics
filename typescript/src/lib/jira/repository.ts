import 'isomorphic-fetch';
// import { Promise, Map } from 'core-js' //es6 ponyfills -- typings install --save --global dt~core-js
import { IIssueList, IIssue } from './models';
import {  IWorkItem, WorkItem } from '../core/models';
import { IJiraSettings } from '../jira/settings';
import { request, getHeaders } from '../core/http';

const getIssues = async function(query: string, username: string, password: string): Promise<IIssue[]> {
  const headers: Headers = getHeaders(username, password);
  const result: IIssueList = await request(query, headers);
  const issues: IIssue[] = result.issues;
  return issues;
};

function getJiraQueryUrl(url: string, startIndex: number, batchSize: number, projects: Array<string>, issueTypes: Array<string>, filters: Array<string>): string {
  let clauses: string[] = [];

  const projectClause = (projects.length > 1)
    ? `project in (${ projects.join(',') })`
    : `project=${ projects[0] }`;
  clauses.push(projectClause);

  if (issueTypes.length > 0) {
    const typeClause = `issuetype in (${issueTypes.join(',')})`;
    clauses.push(typeClause);
  }

  const filterClauses: string[] = filters.map((filter: string) => `filter="${filter}"`);
  clauses.push(...filterClauses);

  const jql = `${clauses.join(' AND ')} order by key`;
  const query = `${url}/search?jql=${encodeURIComponent(jql)}&startAt=${startIndex}&maxResults=${batchSize}&expand=changelog`;
  return query;
};

const parseAttributeArray = (attributeArray: any[]): string => {
  let parsedAttributes: string[] = attributeArray.map(attributeArrayElement => {
    return parseAttribute(attributeArrayElement);
  });

  if (parsedAttributes.length === 0) {
    return '';
  }
  const result = parsedAttributes.length === 1 ? parsedAttributes[0] : `[${parsedAttributes.join(';')}]`;
  return result;
};

const parseAttribute = (attributeData: any): string => {
  if (attributeData === undefined || attributeData == null) return '';

  if (typeof attributeData === 'string') {
    return attributeData;
  } else if (typeof attributeData === 'number') {
    return attributeData.toString();
  } else {
    return attributeData.name;
  }
};

const getAttributes = (fields = {}, attributesRequested: {}) => {
  const attributeAliases = Object.keys(attributesRequested); // human name alias
  return attributeAliases.reduce((attributesMap, attributeAlias) => {
    // needs to add the customfield_ stuff...
    const attributeSystemName = attributesRequested[attributeAlias];
    const attributeData: any = fields[attributeSystemName];

    const parsed: string = Array.isArray(attributeData)
      ? parseAttributeArray(attributeData)
      : parseAttribute(attributeData);

    attributesMap[attributeSystemName] = parsed;
    return attributesMap;
  }, {});
};

const getStagingDates = (issue: IIssue,
  stages: string[],
  stageMap: Map<string, number>,
  createInFirstStage: boolean = true,
  resolvedInLastStage: boolean = false): string[] => {

  const unusedStages = new Map<string, number>();
  const stageBins: string[][] = stages.map(() => []); // todo, we dont need stages variable....just create array;

  if (createInFirstStage) {
    const creationDate: string = issue.fields.created;
    stageBins[0].push(creationDate);
  }

  if (resolvedInLastStage) {
    if (issue.fields.status !== undefined || issue.fields.status != null ) {
      if (issue.fields['status'].name === 'Closed') {
        if (issue.fields['resolutiondate'] !== undefined || issue.fields['resolutiondate'] != null) {
          const resolutionDate: string = issue.fields['resolutiondate'];
          const doneStageIndex: number = stageMap.get('Closed');
          stageBins[doneStageIndex].push(resolutionDate);
        }
      }
    }
  }

  // sort status changes into stage bins
  issue.changelog.histories.forEach(history => {
    history.items.forEach(historyItem => {
      if (historyItem.field === 'status') {
        const stageName: string = historyItem.toString;

        if (stageMap.has(stageName)) {
          const stageIndex: number = stageMap.get(stageName);
          const stageDate: string = history.created;
          stageBins[stageIndex].push(stageDate);
        } else {
          const count: number = unusedStages.has(stageName) ? unusedStages.get(stageName) : 0;
          unusedStages.set(stageName, count + 1);
        }
      }
    });
  });

  // go through each stage and get best date
  let latestValidDate: string = '';
  const stagingDates = stageBins.map((stageBin: string[], idx: number) => {
    let validStageDates = stageBin.filter(date => {
      return date >= latestValidDate ? true : false;
    });
    if (validStageDates.length > 1) {
      validStageDates = validStageDates.sort().slice(0, 1); // keep only the earliest...
      // go forward in time and filter??
      for (let j = idx + 1; j < stageBins.length; j++) {
        stageBins[j] = stageBins[j].filter(date => {
          return date >= latestValidDate ? true : false;
        });
      }
    }

    if (validStageDates.length > 0) {
      latestValidDate = validStageDates[0].split('T')[0];
      return latestValidDate;
    }
    return '';
  });
  // return { stagingDates, unusedStages };
  return stagingDates;
};

const getWorkItemsBatch = async function(start: number, batchSize: number, settings: IJiraSettings): Promise<IWorkItem[]> {
  const url = getJiraQueryUrl(settings.ApiUrl, start, batchSize, settings.Criteria.Projects, settings.Criteria.IssueTypes, settings.Criteria.Filters);
  const issues = await getIssues(url, settings.Connection.Username, settings.Connection.Password);

  const items = issues.map(issue => {
    const key: string = issue.key;
    const name: string = issue.fields['summary'];
    const stagingDates = getStagingDates(issue, settings.Stages, settings.StageMap, settings.CreateInFirstStage, settings.ResolvedInLastStage);
    const type = issue.fields.issuetype.name ? issue.fields.issuetype.name : '';
    const attributes = getAttributes(issue.fields, settings.Attributes);

    const item = new WorkItem(key, stagingDates, name, type, attributes);
    return item;
  });
  return items;
};

const getAllWorkItemsFromJira = async function(settings: IJiraSettings, resultsPerBatch = 25): Promise<IWorkItem[]> {
  const metadata = await request(
    getJiraQueryUrl(
      settings.ApiUrl, 
      0, 
      1, 
      settings.Criteria.Projects, 
      settings.Criteria.IssueTypes, 
      settings.Criteria.Filters), 
      getHeaders(
        settings.Connection.Username, 
        settings.Connection.Password
      )
    );

  const totalJiras: number = metadata.total;  // e.g. 98
  const batchSize: number = resultsPerBatch;
  const totalBatches: number = Math.ceil(totalJiras / batchSize); // e.g. 4

  let allWorkItems: WorkItem[] = [];
  for (let i = 0; i < totalBatches; i++) {
    const workItemsBatch = await getWorkItemsBatch(i * batchSize, batchSize, settings);
    allWorkItems.push(...workItemsBatch);
  }
  return allWorkItems;
};

export { 
  getAllWorkItemsFromJira,
  getWorkItemsBatch,
  getJiraQueryUrl,
  getStagingDates,
  getAttributes,
};

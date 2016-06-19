import 'isomorphic-fetch';
// import { Promise, Map } from 'core-js' //es6 ponyfills -- typings install --save --global dt~core-js
import { IIssueList, IIssue, IJiraSettings } from './models';
import { IWorkItem, WorkItem } from '../core/work-item';
import { getJsonFromUrl, getHeaders } from '../core/http';

const getIssues = async function(query: string, username: string, password: string): Promise<IIssue[]> {
  const headers: Headers = getHeaders(username, password);
  const result: IIssueList = await getJsonFromUrl(query, headers);
  if (result.issues) {
    const issues: IIssue[] = result.issues;
    return issues;
  } else {
    throw new Error('Could not retrieve issues from object');
  }
};

function getJiraQueryUrl(url: string, startIndex: number, batchSize: number, projects: Array<string>, issueTypes: Array<string>, filters: Array<string>): string {
  let clauses: string[] = [];

  const projectClause = (projects.length > 1)
    ? `project in (${projects.join(',')})`
    : `project=${projects[0]}`;
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

const parseAttribute = (attribute: any): string => {
  if (attribute === undefined || attribute == null) {
    return '';
  } else if (typeof attribute === 'string') {
    return attribute;
  } else if (typeof attribute === 'number') {
    return attribute.toString();
  } else {
    return attribute.name;
  }
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

const getAttributes = (fields, attributesRequested) => {
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

  // get earliest date per stage and handle backflow
  let latestValidIssueDateSoFar: string = '';
  const stagingDates = stageBins.map((stageBin: string[], idx: number) => {
    let validStageDates: string[] = stageBin.filter(date => {
      return date >= latestValidIssueDateSoFar ? true : false;
    });

    if (validStageDates.length) {
      validStageDates.sort();
      latestValidIssueDateSoFar = validStageDates[validStageDates.length - 1];
      const earliestStageDate = validStageDates[0]; 
      return earliestStageDate.split('T')[0];
    } else {
      return '';
    }
  });
  return stagingDates;
};

const createWorkItem = (issue: IIssue, settings: IJiraSettings): IWorkItem => {
  const key: string = issue.key;
  const name: string = issue.fields['summary'];
  const stagingDates = getStagingDates(issue, settings.Stages, settings.StageMap, settings.CreateInFirstStage, settings.ResolvedInLastStage);
  const type = issue.fields.issuetype.name ? issue.fields.issuetype.name : '';
  const attributes = getAttributes(issue.fields, settings.Attributes);

  const workItem = new WorkItem(key, stagingDates, name, type, attributes);
  return workItem;
};

const getWorkItemsBatch = async function(start: number, batchSize: number, settings: IJiraSettings): Promise<IWorkItem[]> {
  const url = getJiraQueryUrl(settings.ApiUrl, start, batchSize, settings.Criteria.Projects, settings.Criteria.IssueTypes, settings.Criteria.Filters);
  const issues = await getIssues(url, settings.Connection.Username, settings.Connection.Password);
  const workItems = issues.map(issue => createWorkItem(issue, settings));
  return workItems;
};

const getAllWorkItemsFromJira = async function(settings: IJiraSettings, resultsPerBatch = 25): Promise<IWorkItem[]> {
  const metadata = await getJsonFromUrl(
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

  const totalJiras: number = metadata.total; 
  const batchSize: number = resultsPerBatch;
  const totalBatches: number = Math.ceil(totalJiras / batchSize); 

  console.log(`Connection successful. ${totalJiras} issues detected.`);

  let allWorkItems: WorkItem[] = [];
  for  (let i = 0; i < totalBatches; i++) {
    const rangeLower: number = i * batchSize;
    const rangeUpper: number = Math.min((i * batchSize) + batchSize - 1, totalJiras);
    console.log(`Extracting batch ${i + 1}/${totalBatches} -- Isssue(s) ${rangeLower}-${rangeUpper} out of ${totalJiras}`);
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

import 'isomorphic-fetch';
import { IIssueList, IIssue, IWorkItem, WorkItem } from './models';

function status(response: IResponse): Promise<any> {
  if (response.status >= 200 && response.status < 300) {
    return Promise.resolve(response);
  } else {
    return Promise.reject(new Error(response.statusText));
  }
};

function json(response: IResponse): Promise<IResponse> {
  return response.json();
};

function request(url: string, headers: Headers): Promise<any> {
  console.log(url);
  return fetch(url, { headers })
    .then(status)
    .then(json)
    .then(json => Promise.resolve(json))
    .catch(error => Promise.reject(error));
};

const getIssues = async function(query: string, settings: any): Promise<IIssue[]> {
  const headers = getHeaders(settings.username, settings.password);
  const result: IIssueList = await request(query, headers);
  const issues = <IIssue[]>result.issues;
  return issues;
};

const getHeaders = (username: string, password: string): Headers => {
  const headers = new Headers();
  headers.append('Accept', 'application/json');
  if (username && password) {
    headers.append('Authorization', `Basic ${btoa(username + ':' + password)}`);
  }
  return headers;
};

function getJiraQueryUrl(startIndex: number, batchSize: number, settings: any): string {
  let clauses: string[] = [];
  const projectClause = (settings.projectNames.length > 1)
    ? `project in (${ settings.projectNames.join(',') })`
    : `project=${ settings.projectNames[0] }`;
  clauses.push(projectClause);

  if (settings.types.length > 0) {
    const typeClause = `issuetype in (${settings.types.join(',')})`;
    clauses.push(typeClause);
  }

  const filterClauses: string[] = settings.filters.map((filter: string) => `filter="${filter}"`);
  clauses.push(...filterClauses);

  const jql = `${clauses.join(' AND ')} order by key`;
  const query = `${settings.urlRoot}/search?jql=${encodeURIComponent(jql)}&startAt=${startIndex}&maxResults=${batchSize}&expand=changelog`;

  return query;
};

const parseAttributeArray = (attributeArray: any[]): string => {
  let parsedAttributes: string[] = attributeArray.map(attributeArrayElement => {
    return parseAttribute(attributeArrayElement);
  });//.filter(v => v !== ''); // get rid of '' might not be necessary anymore

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

    const attribute = {};
    attribute[attributeSystemName] = parsed;
    return Object.assign(attributesMap, attribute);
  }, {});
};

const getStagingDates = (issue: IIssue,
  stages: string[],
  stageMap: Map<string, number>,
  createInFirstStage: boolean = true,
  resolvedInLastStage: boolean = false): string[] => {

  const unusedStages = new Map<string, number>();
    const stageBins: string[][] = stages.map(() => []);

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

const getWorkItemsBatch = async function(start: number, batchSize: number, settings: any) : Promise<WorkItem[]> {
  const url = getJiraQueryUrl(start, batchSize, settings);
  const issues = await getIssues(url, settings);

  const items = issues.map(issue => {
    const key: string = issue.key;
    const name: string = issue.fields['summary'];
    const stagingDates = getStagingDates(issue, settings.stages, settings.stageMap, settings.createInFirstStage, settings.resolvedInLastStage);
    const type = settings.types.length ? issue.fields.issuetype.name : '';
    const attributes = getAttributes(issue.fields, settings.attributes);

    const item = new WorkItem(key, stagingDates, name, type, attributes);
    return item;
  });
  return items;
};

const getAllWorkItems = async function(settings: any): Promise<WorkItem[]> {
  // pre query
  const metadata = await request(getJiraQueryUrl(0, 1, settings), getHeaders(null, null));

  const total: number = metadata.total;  //e.g. 98
  const batchSize: number = settings.batchSize; //e.g. 25
  const chunks = Math.ceil(total / batchSize); //e.g. 4

  let allWorkItems: WorkItem[] = [];
  for (let i = 0; i < chunks; i++) {
    const workItemsBatch = await getWorkItemsBatch(i * batchSize, batchSize, settings);
    allWorkItems.push(...workItemsBatch);
  }
  return allWorkItems;
};

export { getAllWorkItems };

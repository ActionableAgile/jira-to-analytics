export interface IQueryOptions {
  apiRootUrl: string;
  projects: Array<string>;
  issueTypes: Array<string>;
  filters: Array<string>;
  startDate: Date;
  endDate: Date;
  customJql: string;
  startIndex: number;
  batchSize: number;
}

const buildApiUrl = (rootUrl) => `${rootUrl}/rest/api/latest`;

const buildJiraSearchQueryUrl = (options: IQueryOptions): string => {
  const {
    apiRootUrl,
    projects,
    issueTypes,
    filters,
    startDate,
    endDate,
    customJql,
    startIndex,
    batchSize,
  } = options;

  let clauses: Array<string> = [];

  // Handle Projects...
  const projectClause = (projects.length > 1)
    ? `project in (${projects.join(',')})`
    : `project=${projects[0]}`;
  clauses.push(projectClause);

  // Handle Issues...
  if (issueTypes.length > 0) {
    const typeClause = `issuetype in (${issueTypes.join(',')})`;
    clauses.push(typeClause);
  }
  // Handle Custom JQL
  if (customJql) {
    clauses.push(`(${customJql})`);
  }

  // Handle Custom Start/End dates
  if (startDate && endDate) {
    const dateToExcludeStoriesBefore = startDate;
    const dateToExcludeStoriesAfter = endDate;
    const dateFilterQuery = `((resolutionDate >= "${formatDate(dateToExcludeStoriesBefore)}" OR resolution = Unresolved) OR (resolutionDate <= "${formatDate(dateToExcludeStoriesAfter)}"))`;
    clauses.push(dateFilterQuery);
  } else if (startDate) {
    const dateToExcludeStoriesBefore = startDate;
    const excludeAllStoriesClosedAfterDateClause =  `(resolutionDate >= "${formatDate(dateToExcludeStoriesBefore)}" OR resolution = Unresolved)`;
    clauses.push(excludeAllStoriesClosedAfterDateClause);
  } else if (endDate) {
    const dateToExcludeStoriesAfter = endDate;
    const excludeAllStoriesClosedBeforeDateClause =  `(resolutionDate <= "${formatDate(dateToExcludeStoriesAfter)}")`;
    clauses.push(excludeAllStoriesClosedBeforeDateClause);
  }

  // Handle Filters...
  const filterClauses: string[] = filters.map((filter: string) => `filter="${filter}"`);
  clauses.push(...filterClauses);

  // AND together
  const jql = `${clauses.join(' AND ')} order by key`;

  // Append JQL to url, also add start and maxresults
  const query = `${buildApiUrl(apiRootUrl)}/search?jql=${encodeURIComponent(jql)}&startAt=${startIndex}&maxResults=${batchSize}&expand=changelog`;
  return query;
};

const buildJiraGetProjectsUrl = (apiRootUrl: string): string => {
  const url = `${buildApiUrl(apiRootUrl)}/project`;
  return url;
};

const buildJiraGetWorkflowsUrl = (project: string, apiRootUrl: string): string => {
  const url = `${buildApiUrl(apiRootUrl)}/project/${project}/statuses`;
  return url;
};

const formatDate = (date: Date): string => {
  const formattedDate = `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  return formattedDate;
};

export {
  buildJiraSearchQueryUrl,
  buildJiraGetProjectsUrl,
  buildJiraGetWorkflowsUrl,
};
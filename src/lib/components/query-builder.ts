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

const formatDate = (date: Date): string => `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`;

const buildJQL = (options: IQueryOptions): string => {
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
  if (projects.length > 0) {
    const projectClause = (projects.length > 1)
      ? `project in (${projects.join(',')})`
      : `project=${projects[0]}`;
    clauses.push(projectClause);
  }

  // Handle Issues...
  if (issueTypes.length > 0) {
    const typeClause = `issuetype in (${issueTypes.map(issue => `"${issue}"`).join(',')})`;
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
    const excludeAllStoriesClosedAfterDateClause = `(resolutionDate >= "${formatDate(dateToExcludeStoriesBefore)}" OR resolution = Unresolved)`;
    clauses.push(excludeAllStoriesClosedAfterDateClause);
  } else if (endDate) {
    const dateToExcludeStoriesAfter = endDate;
    const excludeAllStoriesClosedBeforeDateClause = `(resolutionDate <= "${formatDate(dateToExcludeStoriesAfter)}")`;
    clauses.push(excludeAllStoriesClosedBeforeDateClause);
  }

  // Handle Filters...
  const filterClauses: string[] = filters.map((filter: string) => `filter="${filter}"`);
  clauses.push(...filterClauses);

  // AND together
  const jql = `${clauses.join(' AND ')} order by key`;
  return jql;
};

const buildJiraSearchQueryUrl = (options: IQueryOptions): string => {
  const { apiRootUrl, startIndex, batchSize } = options;
  const jql = buildJQL(options);
  // Append JQL to url, also add start and maxresults
  const query = `${buildApiUrl(apiRootUrl)}/search?jql=${encodeURIComponent(jql)}&startAt=${startIndex}&maxResults=${batchSize}&expand=changelog`;
  console.log(query);
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

export {
  buildJQL,
  buildJiraSearchQueryUrl,
  buildJiraGetProjectsUrl,
  buildJiraGetWorkflowsUrl,
};
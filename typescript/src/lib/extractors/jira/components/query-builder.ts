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
    
  let clauses: string[] = [];

  const projectClause = (projects.length > 1)
  ? `project in (${projects.join(',')})`
  : `project=${projects[0]}`;
  clauses.push(projectClause);

  if (issueTypes.length > 0) {
    const typeClause = `issuetype in (${issueTypes.join(',')})`;
    clauses.push(typeClause);
  }

  if (customJql) {
    clauses.push(`(${customJql})`);
  }

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

  const filterClauses: string[] = filters.map((filter: string) => `filter="${filter}"`);
  clauses.push(...filterClauses);

  const jql = `${clauses.join(' AND ')} order by key`;
  // console.log(`\nBuilt JQL:\n${jql}\n`);
  const query = `${apiRootUrl}/search?jql=${encodeURIComponent(jql)}&startAt=${startIndex}&maxResults=${batchSize}&expand=changelog`;
  // console.log(`Built Query URL:\n${query}\n`)
  return query;
};

const buildJiraGetProjectsUrl = (apiRootUrl: string): string => {
  const url = `${apiRootUrl}/project`;
  return url;
};

const buildJiraGetWorkflowsUrl = (project: string, apiRootUrl: string): string => {
  const url = `${apiRootUrl}/project/${project}/statuses`;
  return url;
};

const formatDate = (date: Date): string => {
  const formattedDate = `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  return formattedDate;
}

export {
    buildJiraSearchQueryUrl,
    buildJiraGetProjectsUrl,
    buildJiraGetWorkflowsUrl,
};
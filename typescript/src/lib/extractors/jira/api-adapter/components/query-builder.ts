const buildJiraQueryUrl = (
    url: string, 
    projects: Array<string>, 
    issueTypes: Array<string> = [], 
    filters: Array<string> = [],
    startIndex: number = 0, 
    batchSize: number = 1
    ): string => {
    
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

export {
    buildJiraQueryUrl,
};
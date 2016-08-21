const buildJiraSearchQueryUrl = (
    apiRootUrl: string, 
    projects: Array<string>, 
    issueTypes: Array<string> = [], 
    filters: Array<string> = [],
    workflowKeyVal: {} = {},
    startDate: Date,
    endDate: Date,
    customJql: string,
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

  if (customJql) {
    clauses.push(`(${customJql})`);
  }

  // project=UT AND issuetype in (Story,Bug) AND (Status CHANGED FROM Backlog AFTER ("2016/08/09") OR (Status = Backlog)) order by key
  // (Status CHANGED FROM Backlog AFTER ("2016/08/09") OR (Status = Backlog)) order by key

  // if (startDate) {
  //   const startWorkflowKey = Object.keys(workflowKeyVal)[0];
  //   const startWorkflowValArray = workflowKeyVal[startWorkflowKey].filter(x => x != '(Created)');
  //   if (startWorkflowValArray && startWorkflowValArray.length > 0) {
  //     const clausesToOrTogether = startWorkflowValArray.map(stageName => {
  //       return `Status CHANGED FROM "${stageName}" AFTER ("${formatDate(startDate)}") OR Status = "${stageName}"`; // AFTER!, still need to format date
  //     });
  //     const startFilterClause = `(${clausesToOrTogether.join(' or ')})`;
  //     console.log(startFilterClause);
  //     clauses.push(startFilterClause);
  //   }
  // }

  // exclude all stories closed after ${date}
  //todo change startDate
  const dateToExcludeStoriesBefore = startDate;
  if (dateToExcludeStoriesBefore) {
    // const excludeAllStoriesClosedAfterDateClause = `(status changed to Closed after "${formatDate(dateToExcludeStoriesBefore)}" OR resolution = Unresolved)`;
    const excludeAllStoriesClosedAfterDateClause =  `(resolutionDate >= "${formatDate(dateToExcludeStoriesBefore)}" OR resolution = Unresolved)`;
    clauses.push(excludeAllStoriesClosedAfterDateClause);
  }

  // if (endDate) { 
  //   const endWorkflowKey = Object.keys(workflowKeyVal)[Object.keys(workflowKeyVal).length - 1];
  //   const endWorkflowValArray = workflowKeyVal[endWorkflowKey].filter(x => x != '(Resolved)');
  //   if (endWorkflowValArray && endWorkflowValArray.length > 0) {
  //     const clausesToOrTogether = endWorkflowValArray.map(stageName => {
  //       return `Status CHANGED TO "${stageName}" BEFORE ("${formatDate(endDate)}")`; //BEFORE!, still need to format date
  //     });
  //     const endFilterClause = `(${clausesToOrTogether.join(' or ')})`;
  //     console.log(endFilterClause);
  //     clauses.push(endFilterClause);
  //   }
  // }

  const filterClauses: string[] = filters.map((filter: string) => `filter="${filter}"`);
  clauses.push(...filterClauses);

  const jql = `${clauses.join(' AND ')} order by key`;
  const query = `${apiRootUrl}/search?jql=${encodeURIComponent(jql)}&startAt=${startIndex}&maxResults=${batchSize}&expand=changelog`;
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
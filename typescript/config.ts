const userSettings = {
    url: 'https://jira.atlassian.com/',
    types: ['Sub-task', 'Story', 'Bug'],
    filters: ['HCPUB Desktop - Closed Major+ Bugs'],
    projectNames: ['HCPUB'],
    workflow: {
        'Ready': ['Ready Queue', 'Queue', 'Open', '(CREATED)'],
        'Dev': ['Development'],
        'Dev Done': ['Dev Done'],
        'Test': ['Test'],
        'Done': ['Closed', 'Cancelled'],
    },
    attributes: {
      Team: 'customfield_10001',
      Release: 'customfield_10002.name',
      Stage: 'status',
      Type: 'issuetype',
      Level: 'priority',
      Labels: 'labels',
      Versions: 'fixVersions',
      Components: 'components',
    },
    criteria: {
        foo: 'bar',
    }
}

export default userSettings;

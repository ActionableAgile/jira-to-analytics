// import { expect } from 'chai';
// import JiraExtractor from '../jira-extractor';
// import * as fs from 'fs';
//
// describe('todo: testing', function() {
//   this.timeout(30000);
//   it('smoke test', async function(done){
//     const je = new JiraExtractor(userSettings);
//     await je.extractWorkItems();
//     const csv = je.toCSV();
//     const compare = await loadSeedData('./test/data/testresult.csv');
//     const x = csv.localeCompare(compare);
//     console.log(x);
//     done();
//     return;
//   });
// });
//
// const loadSeedData = (fileName: string) : Promise<string> =>
//   new Promise((accept, reject) => {
//     fs.readFile(fileName, 'utf8', (err, data) => {
//       accept(data);
//     });
//   });
//
// const userSettings = {
//     url: 'https://jira.atlassian.com/',
//     types: ['Sub-task', 'Story', 'Bug'],
//     filters: ['HCPUB Desktop - Closed Major+ Bugs'],
//     projectNames: ['HCPUB'],
//     workflow: {
//         'Ready': ['Ready Queue', 'Queue', 'Open', '(CREATED)'],
//         'Dev': ['Development'],
//         'Dev Done': ['Dev Done'],
//         'Test': ['Test'],
//         'Done': ['Closed', 'Cancelled'],
//     },
//     attributes: {
//       Team: 'customfield_10001',
//       Release: 'customfield_10002.name',
//       Stage: 'status',
//       Type: 'issuetype',
//       Level: 'priority',
//       Labels: 'labels',
//       Versions: 'fixVersions',
//       Components: 'components',
//     },
// }

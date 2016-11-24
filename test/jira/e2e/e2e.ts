// import { expect } from 'chai';
// import * as nock from 'nock';
// import 'isomorphic-fetch';
// import * as fs from 'fs';
// import { safeLoad } from 'js-yaml';
// import { JiraExtractor } from '../../lib/extractors/jira/extractor';
// import json from '../data/json/jira-issues-request';

// const yamlPathVersion1 = './src/test/data/config/config-v1.yaml';
// const yamlPathVersion2 = './src/test/data/config/config-v2.yaml';

// describe('end to end system tests', () => {
//   beforeEach(() => {
//     nock("https://test.atlassian.net")
//       .persist()
//       .filteringPath(path => {
//         if (path.indexOf('startAt=0&maxResults=1') >= 0) {
//           return '/meta';
//         } else {
//           return '/issues';
//         }
//       })
//       .get('/meta')
//       .reply(200, { total: 25 })
//       .get('/issues')
//       .reply(200, json);
// 	});
  
//   describe('e2e naive w/ v1 (legacy) yaml', () => {
//     it('should get sample json and convert it to csv', () => {
//       const yaml = safeLoad(fs.readFileSync(yamlPathVersion1, 'utf8'));
//       yaml.legacy = true;
//       const jiraExtractor = new JiraExtractor().setBatchSize(25).importSettings(yaml, 'yaml');
//       return jiraExtractor.extractAll().then(workItems => {
//         const actualCsv = jiraExtractor.toCSV(workItems);
//         // fs.writeFileSync('compare_csv', csvData);
//         return readString('./src/test/data/csv/sample-jira-issues-csv.csv').then(expectedCsv => {
//           expect(expectedCsv).to.equal(actualCsv);
//         });
//       });
//     });
//   });

//   describe('e2e naive w/ v2 yaml', () => {
//     it('should get sample json and convert it to csv correctly', () => {
//       const yaml = safeLoad(fs.readFileSync(yamlPathVersion2, 'utf8'));
//       yaml.legacy = false;
//       const jiraExtractor = new JiraExtractor().setBatchSize(25).importSettings(yaml, 'yaml');
//       return jiraExtractor.extractAll().then(workItems => {
//         const csvData = jiraExtractor.toCSV(workItems);
//         return readString('./src/test/data/csv/sample-jira-issues-csv.csv').then(actual => {
//           expect(actual).to.equal(csvData);
//         });
//       });
//     });
//   });
// });

// const readString = (path) => {
//     return new Promise((accept, reject) => {
//     fs.readFile(path, 'utf8', (err, data) => {
//       if (err) {
//         console.log('error loading file path');
//         return reject(err);
//       }
//       return accept(data);
//     });
//   });
// };
// import 'mocha';
// import { expect } from 'chai';
// import { buildJiraSearchQueryUrl } from './query-builder';

// describe('query builder', () => {
//     it('should build query from multiple entry arrays', () => {
//         const endDate = new Date(2016, 11, 26);
//         const startDate = new Date(2016, 11, 13);

//         const builtSearchQueryUrl = buildJiraSearchQueryUrl({
//             apiRootUrl: 'https://APIROOTURL',
//             batchSize: 25,
//             customJql: '',
//             endDate: endDate,
//             filters: ['a', 'b', 'c'],
//             issueTypes: ['ISSUE_TYPE1', 'ISSUE_TYPE2'],
//             projects: ['TESTPROJECT1', 'TESTPROJECT2'],
//             startDate: startDate,
//             startIndex: 0,
//         });

//         const actual = 'https://APIROOTURL/rest/api/latest/search?jql=project%20in%20(TESTPROJECT1%2CTESTPROJECT2)%20AND%20issuetype%20in%20(%22ISSUE_TYPE1%22%2C%22ISSUE_TYPE2%22)%20AND%20((resolutionDate%20%3E%3D%20%222016%2F12%2F13%22%20OR%20resolution%20%3D%20Unresolved)%20OR%20(resolutionDate%20%3C%3D%20%222016%2F12%2F26%22))%20AND%20filter%3D%22a%22%20AND%20filter%3D%22b%22%20AND%20filter%3D%22c%22%20order%20by%20key&startAt=0&maxResults=25&expand=changelog';

//         expect(builtSearchQueryUrl).to.equal(actual);
//     });

//     it('should allow for project to be optional', () => {
//         const endDate = new Date(2016, 11, 26);
//         const startDate = new Date(2016, 11, 13);

//         const builtSearchQueryUrl = buildJiraSearchQueryUrl({
//             apiRootUrl: 'https://APIROOTURL',
//             batchSize: 25,
//             customJql: '',
//             endDate: endDate,
//             filters: ['a'],
//             issueTypes: ['ISSUE_TYPE1'],
//             projects: [],
//             startDate: startDate,
//             startIndex: 0,
//         });

//         const actual = 'https://APIROOTURL/rest/api/latest/search?jql=issuetype%20in%20(%22ISSUE_TYPE1%22)%20AND%20((resolutionDate%20%3E%3D%20%222016%2F12%2F13%22%20OR%20resolution%20%3D%20Unresolved)%20OR%20(resolutionDate%20%3C%3D%20%222016%2F12%2F26%22))%20AND%20filter%3D%22a%22%20order%20by%20key&startAt=0&maxResults=25&expand=changelog';

//         expect(builtSearchQueryUrl).to.equal(actual);
//     });
//     it('should support issue types with spaces', () => {
//         const endDate = new Date(2016, 11, 26);
//         const startDate = new Date(2016, 11, 13);

//         const builtSearchQueryUrl = buildJiraSearchQueryUrl({
//             apiRootUrl: 'https://APIROOTURL',
//             batchSize: 25,
//             customJql: '',
//             endDate: endDate,
//             filters: ['a'],
//             issueTypes: ['ISSUE_TYPE WITH SPACES'],
//             projects: ['TESTPROJECT'],
//             startDate: startDate,
//             startIndex: 0,
//         });

//         const actual = 'https://APIROOTURL/rest/api/latest/search?jql=project%3DTESTPROJECT%20AND%20issuetype%20in%20(%22ISSUE_TYPE%20WITH%20SPACES%22)%20AND%20((resolutionDate%20%3E%3D%20%222016%2F12%2F13%22%20OR%20resolution%20%3D%20Unresolved)%20OR%20(resolutionDate%20%3C%3D%20%222016%2F12%2F26%22))%20AND%20filter%3D%22a%22%20order%20by%20key&startAt=0&maxResults=25&expand=changelog';

//         expect(builtSearchQueryUrl).to.equal(actual);
//     });
//     it('should build query from single entry arrays', () => {

//         const endDate = new Date(2016, 11, 26);
//         const startDate = new Date(2016, 11, 13);

//         const builtSearchQueryUrl = buildJiraSearchQueryUrl({
//             apiRootUrl: 'https://APIROOTURL',
//             batchSize: 25,
//             customJql: '',
//             endDate: endDate,
//             filters: ['a'],
//             issueTypes: ['ISSUE_TYPE1'],
//             projects: ['TESTPROJECT'],
//             startDate: startDate,
//             startIndex: 0,
//         });

//         const actual = 'https://APIROOTURL/rest/api/latest/search?jql=project%3DTESTPROJECT%20AND%20issuetype%20in%20(%22ISSUE_TYPE1%22)%20AND%20((resolutionDate%20%3E%3D%20%222016%2F12%2F13%22%20OR%20resolution%20%3D%20Unresolved)%20OR%20(resolutionDate%20%3C%3D%20%222016%2F12%2F26%22))%20AND%20filter%3D%22a%22%20order%20by%20key&startAt=0&maxResults=25&expand=changelog';

//         expect(builtSearchQueryUrl).to.equal(actual);
//     });
// });
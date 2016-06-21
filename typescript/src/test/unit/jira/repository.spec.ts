import { expect } from 'chai';
import { IIssue } from '../../../lib/jira/models';
import { getAllWorkItemsFromJira,
  getWorkItemsBatch,
  getJiraQueryUrl,
  getStagingDates,
  getAttributes,
} from '../../../lib/jira/repository';

describe('jira repository', () => {
  describe('query builder', () => {
    it('should build complete jira query', () => {
      const baseUrl = `http://google.com`;
      const startIndex = 2;
      const batchSize = 25;
      const projects = ['Project1', 'Project2'];
      const issueTypes = ['Issue1', 'Issue2'];
      const filters = ['Filter1', 'Filter2'];
      const actual = getJiraQueryUrl(baseUrl, startIndex, batchSize, projects, issueTypes, filters);
      const expected = 'http://google.com/search?jql=project%20in%20(Project1%2CProject2)%20AND%20issuetype%20in%20(Issue1%2CIssue2)%20AND%20filter%3D%22Filter1%22%20AND%20filter%3D%22Filter2%22%20order%20by%20key&startAt=2&maxResults=25&expand=changelog';
      expect(expected).to.equal(actual);
    });
  });

  describe('attribute parser', () => {
    it('should get basic attributes and attribute arrays correctly', () => {
      const fields = {
        a: 'a',
        b: 1,
        c: ['c', 2],
      };

      const requestedAttributes = {
        'A Letter': 'a',
        'A Number': 'b',
        'An Array': 'c',
      };

      const actual = getAttributes(fields, requestedAttributes);
      const expected = {
        a: 'a',
        b: '1',
        c: '[c;2]',
      };
      
      expect(expected).to.deep.equal(actual);
    });
  });

  describe('staging dates', () => {
    it('should extract the correct dates when dates are in order', () => {

      const stages = ['First', 'Second', 'Third', 'Fourth'];
      const stageMap: Map<string, number> = new Map();
      stageMap.set('first', 0);
      stageMap.set('second', 1);
      stageMap.set('third', 2);
      stageMap.set('fourth', 3);

      const testIssue: IIssue = {
        key: 'testkey',
        fields: {},
        changelog: {
          total: 4,
          histories: [
            {
              id: '1',
              items: [{
                field: 'status',
                toString: 'first',
              }],
              created: '2016-01-01',
            },
            {
              id: '2',
              items: [{
                field: 'status',
                toString: 'second',
              }],
              created: '2016-01-02',
            },
            {
              id: '3',
              items: [{
                field: 'status',
                toString: 'third',
              }],
              created: '2016-01-02',
            },
            {
              id: '4',
              items: [{
                field: 'status',
                toString: 'fourth',
              }],
              created: '2016-01-03',
            },
          ],
        },
      };

      const actual = getStagingDates(testIssue, stages, stageMap, false, false);
      const expected = ['2016-01-01', '2016-01-02', '2016-01-02', '2016-01-03'];

      expect(expected).to.deep.equal(actual);
    });

    it('should extract the correct dates when dates have back flow', () => {

      const stages = ['First', 'Second', 'Third', 'Fourth'];
      const stageMap: Map<string, number> = new Map();
      stageMap.set('first', 0);
      stageMap.set('second', 1);
      stageMap.set('third', 2);
      stageMap.set('fourth', 3);

      const testIssue: IIssue = {
        key: 'testkey',
        fields: {
          foo: 'bar',
        },
        changelog: {
          total: 6,
          histories: [
            {
              id: '1',
              items: [{
                field: 'status',
                toString: 'first',
              }],
              created: '2016-01-01',
            },
            {
              id: '2',
              items: [{
                field: 'status',
                toString: 'second',
              }],
              created: '2016-01-02',
            },
            {
              id: '3',
              items: [{
                field: 'status',
                toString: 'third',
              }],
              created: '2016-01-03',
            },
            {
              id: '4',
              items: [{
                field: 'status',
                toString: 'fourth',
              }],
              created: '2016-01-04',
            },
            {
              id: '5',
              items: [{
                field: 'status',
                toString: 'third',
              }],
              created: '2016-01-05',
            },
            {
              id: '6',
              items: [{
                field: 'status',
                toString: 'fourth',
              }],
              created: '2016-01-06',
            },
          ],
        },
      };

      const actual = getStagingDates(testIssue, stages, stageMap, false, false);
      const expected = ['2016-01-01', '2016-01-02', '2016-01-03', '2016-01-06']; // is this correct?

      expect(expected).to.deep.equal(actual);
    });
  });
});

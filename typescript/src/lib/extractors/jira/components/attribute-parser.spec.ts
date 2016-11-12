import 'mocha';
import { expect } from 'chai';

import {
  getAttributes,
} from './attribute-parser';

const requestedAttributes = [
  'customfield_10500',
  'customfield_10501',
  'resolutiondate',
  'customfield_10011',
  'customfield_10012',
  'customfield_10600',
  'customfield_10601',
  'customfield_10000'
];

const attributes = {
  'customfield_10500': 'Team4',
  'customfield_10501': [
    {
      'self': 'https://actionableagile.atlassian.net/rest/api/2/customFieldOption/10100',
      'value': '1',
      'id': '10100'
    },
    {
      'self': 'https://actionableagile.atlassian.net/rest/api/2/customFieldOption/10102',
      'value': '3',
      'id': '10102'
    },
    {
      'self': 'https://actionableagile.atlassian.net/rest/api/2/customFieldOption/10103',
      'value': '4',
      'id': '10103'
    }
  ],
  'customfield_10502': [
    'label1',
    'label2'
  ],
  'customfield_10503': {
    'self': 'https://actionableagile.atlassian.net/rest/api/2/user?username=johnrjj',
    'name': 'johnrjj',
    'key': 'johnrjj',
    'emailAddress': 'johnrjj@gmail.com',
    'displayName': 'John Johnson',
    'active': true,
    'timeZone': 'America/New_York'
  },
  'customfield_10504': null,
  'resolutiondate': '2016-11-02T18:27:07.000-0400',
  'workratio': -1,
  'lastViewed': '2016-11-03T08:54:08.246-0400',
  'watches': {
    'self': 'https://actionableagile.atlassian.net/rest/api/2/issue/UT-282/watchers',
    'watchCount': 1,
    'isWatching': true
  },
  'created': '2015-11-21T07:03:18.000-0500',
  'customfield_10020': null,
  'customfield_10021': null,
  'customfield_10022': null,
  'priority': {
    'self': 'https://actionableagile.atlassian.net/rest/api/2/priority/1',
    'iconUrl': 'https://actionableagile.atlassian.net/images/icons/priorities/highest.svg',
    'name': 'Highest',
    'id': '1'
  },
  'customfield_10023': 'Not started',
  'customfield_10100': null,
  'customfield_10024': null,
  'customfield_10300': '',
  'labels': [],
  'customfield_10016': null,
  'customfield_10017': null,
  'customfield_10018': null,
  'customfield_10019': null,
  'timeestimate': null,
  'aggregatetimeoriginalestimate': null,
  'versions': [],
  'issuelinks': [],
  'assignee': {
    'self': 'https://actionableagile.atlassian.net/rest/api/2/user?username=johnrjj',
    'name': 'johnrjj',
    'key': 'johnrjj',
    'emailAddress': 'johnrjj@gmail.com',
    'displayName': 'John Johnson',
    'active': true,
    'timeZone': 'America/New_York'
  },
  'updated': '2016-11-03T08:54:08.000-0400',
  'status': {
    'self': 'https://actionableagile.atlassian.net/rest/api/2/status/10002',
    'description': '',
    'iconUrl': 'https://actionableagile.atlassian.net/',
    'name': 'Backlog',
    'id': '10002',
    'statusCategory': {
      'self': 'https://actionableagile.atlassian.net/rest/api/2/statuscategory/2',
      'id': 2,
      'key': 'new',
      'colorName': 'blue-gray',
      'name': 'To Do'
    }
  },
  'components': [
    {
      'self': 'https://actionableagile.atlassian.net/rest/api/2/component/10000',
      'id': '10000',
      'name': 'Team 3'
    }
  ],
  'timeoriginalestimate': null,
  'description': null,
  'customfield_10011': '0|i001sf:',
  'customfield_10012': null,
  'customfield_10013': null,
  'customfield_10014': null,
  'customfield_10015': null,
  'customfield_10005': null,
  'customfield_10006': null,
  'customfield_10600': [
    {
      'self': 'https://actionableagile.atlassian.net/rest/api/2/customFieldOption/10203',
      'value': '2',
      'id': '10203'
    }
  ],
  'customfield_10007': null,
  'customfield_10601': {
    'self': 'https://actionableagile.atlassian.net/rest/api/2/customFieldOption/10206',
    'value': 'z',
    'id': '10206'
  },
  'aggregatetimeestimate': null,
  'summary': 'Sample Item 282',
  'creator': {
    'self': 'https://actionableagile.atlassian.net/rest/api/2/user?username=admin',
    'name': 'admin',
    'key': 'admin',
    'emailAddress': 'daniel@actionableagile.com',
    'displayName': 'Daniel Vacanti',
    'active': true,
    'timeZone': 'America/New_York'
  },
  'subtasks': [],
  'reporter': {
    'self': 'https://actionableagile.atlassian.net/rest/api/2/user?username=admin',
    'name': 'admin',
    'key': 'admin',
    'emailAddress': 'daniel@actionableagile.com',
    'displayName': 'Daniel Vacanti',
    'active': true,
    'timeZone': 'America/New_York'
  },
  'customfield_10000': '2016-11-02T18:27:07.587-0400',
  'aggregateprogress': {
    'progress': 0,
    'total': 0
  },
  'customfield_10001': null,
  'customfield_10002': null,
  'customfield_10200': null,
  'customfield_10003': null,
  'customfield_10004': null
};

describe('attribute parser', () => {
  it('should parse complex custom attributes', () => {
    const res = getAttributes(attributes, requestedAttributes);
    expect(res).to.be.deep.equals({
      customfield_10500: 'Team4',
      customfield_10501: '[1;3;4]',
      resolutiondate: '2016-11-02T18:27:07.000-0400',
      customfield_10011: '0|i001sf:',
      customfield_10012: '',
      customfield_10600: '2',
      customfield_10601: 'z',
      customfield_10000: '2016-11-02T18:27:07.587-0400'
    });
  });
});

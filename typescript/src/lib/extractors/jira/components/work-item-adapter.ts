import { WorkItem } from'../../../core/work-item';
import { getStagingDates } from './staging-parser';
import { getAttributes } from './attribute-parser';
import { IWorkItem } from '../../../core/types';

const convertIssuesToWorkItems = function(issues: IIssue[], workflow, attributes: any): IWorkItem[] {
  const workItems = issues.map(issue => convertIssueToWorkItem(issue, workflow, attributes)); 
  return workItems;
};

const convertIssueToWorkItem = (issue: IIssue, workflow: {}, attributes: {}): IWorkItem => {
  const key: string = issue.key;
  const name: string = issue.fields['summary'];
  const stagingDates: string[] = getStagingDates(issue, workflow);
  const type: string = issue.fields.issuetype.name ? issue.fields.issuetype.name : '';
  const requestedAttributeSystemNames: string[] = Object.keys(attributes).map(key => attributes[key]);
  const attributesKeyVal: {} = getAttributes(issue.fields, requestedAttributeSystemNames);
  const workItem: WorkItem = new WorkItem(key, stagingDates, name, type, attributesKeyVal);
  return workItem;
};

export {
  convertIssuesToWorkItems,
  convertIssueToWorkItem,
};
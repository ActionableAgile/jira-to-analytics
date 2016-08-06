import { WorkItem } from'../../../core/work-item';
import { getStagingDates } from './staging-parser';
import { getAttributes } from './attribute-parser';
import { getIssues } from './jira-adapter';

const convertIssueToWorkItem = (
  issue: IIssue,
  stages: string[],
  stageMap: Map<string, number>,
  createInFirstStage: boolean,
  resolvedInLastStage: boolean,
  attributes: any
): IWorkItem => {
  const key: string = issue.key;
  const name: string = issue.fields['summary'];
  // refactor this one
  const stagingDates: string[] = getStagingDates(issue, stages, stageMap, createInFirstStage, resolvedInLastStage);
  const type: string = issue.fields.issuetype.name ? issue.fields.issuetype.name : '';

  const requestedAttributeSystemNames: string[] = Object.keys(attributes).map(key => attributes[key]);
  const attributesMap: {} = getAttributes(issue.fields, requestedAttributeSystemNames);

  const workItem: WorkItem = new WorkItem(key, stagingDates, name, type, attributesMap);
  return workItem;
};

const convertIssuesToWorkItems = function(
  issues: IIssue[],
  stages: string[], 
  stageMap: Map<string, number>, 
  createInFirstStage: boolean, 
  resolvedInLastStage: boolean, 
  attributes: any): IWorkItem[] {

  const workItems = issues.map(issue => convertIssueToWorkItem(issue, stages, stageMap, createInFirstStage, resolvedInLastStage, attributes)); 
  return workItems;
};

export {
  convertIssuesToWorkItems,
  convertIssueToWorkItem,
};
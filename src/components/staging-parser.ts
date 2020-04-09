import * as moment from 'moment';
import { JiraApiBaseItem, JiraApiIssue, JiraComputedItem, StagePassedDays, Workflow } from '../types';

const addCreatedToFirstStage = (issue: JiraApiIssue, stageBins: string[][]) => {
  const creationDate: string = issue.fields['created'];
  stageBins[0].push(creationDate);
  return stageBins;
};

const addResolutionDateToClosedStage = (issue: JiraApiIssue, stageMap, stageBins) => {
  if (issue.fields['status'] !== undefined || issue.fields['status'] != null) {
    if (issue.fields['status'].name === 'Closed') {
      if (issue.fields['resolutiondate'] !== undefined || issue.fields['resolutiondate'] != null) {
        const resolutionDate: string = issue.fields['resolutiondate'];
        const doneStageIndex: number = stageMap.get('Closed');
        stageBins[doneStageIndex].push(resolutionDate);
      }
    }
  }
  return stageBins;
};

const processHistories = (issue: JiraApiIssue): [JiraComputedItem] => {
  const sortedItems: [JiraComputedItem] = [].concat.apply([], issue.changelog.histories
    .map(history => [
      history.created,
      history.items.filter(historyItem => historyItem['field'] === 'status')]
    )
    .filter(entry => entry[1].length > 0)
    .map(entry => (<[JiraApiBaseItem]>entry[1])
      .map(item => ({
        fromString: item.fromString,
        toString: item.toString,
        created: entry[0]
      }))
    )
  ).sort((a, b) => a.created < b.created ? -1 : 1);
  let previousCreated: string;
  sortedItems.forEach(item => {
    if (previousCreated) {
      item.previousCreated = previousCreated;
    }
    previousCreated = item.created;
  });
  return sortedItems;
};

const processActiveStatuses = (issue: JiraApiIssue, stages: string[], activeStatuses: string[], sortedItems: [JiraComputedItem], activeStatusesPassedDays: Map<string, StagePassedDays>): moment.Moment => {
  let activeStatusDate: moment.Moment;
  stages
    .filter(stage => activeStatuses.includes(stage))
    .forEach(stage => {
      activeStatusesPassedDays[stage] = sortedItems
        .filter(item => item.fromString === stage)
        .reduce(({ didHappen, passedDays }, item) => {
          if (!item.previousCreated) {
            // account for issues that start with an active status (i.e. Test type of issues start with a TO TEST status)
            item.previousCreated = issue.fields.created;
          }
          const [statusStart, statusEnd] = [item.previousCreated, item.created].map(created => moment(created.split('T')[0]));
          if (!activeStatusDate) {
            // assume the stages array has the correct first active status as first element
            activeStatusDate = statusStart;
          }
          // count the passed days for active statuses
          return { didHappen: true, passedDays: passedDays + statusEnd.diff(statusStart, 'days') };
        }, <StagePassedDays>{ didHappen: false, passedDays: 0 });
    });
  return activeStatusDate;
};

const processInactiveStates = (stages: string[], activeStatuses: string[], sortedItems: [JiraComputedItem], inactiveStatusesDates: Map<string, moment.Moment>) => {
  stages
    .filter(stage => !activeStatuses.includes(stage))
    .forEach(stage => {
      const firstStageItem = sortedItems.find(item => item.toString === stage);
      if (!firstStageItem) { return; }
      inactiveStatusesDates[stage] = moment(firstStageItem.created.split('T')[0]);
    });
};

const getStagingDates = (issue: JiraApiIssue, workflow: Workflow, activeStatuses: Array<string>): string[] => {
  const createInFirstStage = workflow[Object.keys(workflow)[0]].includes('(Created)');
  const resolvedInLastStage = workflow[Object.keys(workflow)[Object.keys(workflow).length - 1]].includes('(Resolved)');

  const stages = Object.keys(workflow);
  const stageMap = stages.reduce((map: Map<string, number>, stage: string, i: number) => {
    return workflow[stage].reduce((map: Map<string, number>, stageAlias: string) => {
      return map.set(stageAlias, i);
    }, map);
  }, new Map<string, number>());

  let stageBins: string[][] = stages.map(() => []); // todo, we dont need stages variable....just create array;

  if (createInFirstStage) {
    stageBins = addCreatedToFirstStage(issue, stageBins);
  }
  if (resolvedInLastStage) {
    stageBins = addResolutionDateToClosedStage(issue, stageMap, stageBins);
  }

  const sortedItems: [JiraComputedItem] = processHistories(issue);

  // at this point, we have an array of `JiraComputedItem` with both `previousCreated` and `created` properties, which
  // reflects the time range the `fromString` status happened
  const inactiveStatusesDates = new Map<string, moment.Moment>();
  const activeStatusesPassedDays = new Map<string, StagePassedDays>();

  // process active statuses
  let activeStatusDate: moment.Moment = processActiveStatuses(issue, stages, activeStatuses, sortedItems, activeStatusesPassedDays);

  // process inactive statuses
  processInactiveStates(stages, activeStatuses, sortedItems, inactiveStatusesDates);

  return stages.map(stage => {
    const isDone = stage.toLowerCase() === 'done';
    if (!activeStatuses.includes(stage) && !isDone) {
      const date = inactiveStatusesDates[stage];
      return (date && date.format('YYYY-MM-DD')) || '';
    }
    // account for non done tasks
    if (isDone && !inactiveStatusesDates[stage]) { return ''; }
    if (isDone) {
      // return previous active status date + its passed days
      return activeStatusDate.format('YYYY-MM-DD');
    }
    const passedDaysResult: StagePassedDays = activeStatusesPassedDays[stage];
    if (!passedDaysResult.didHappen) { return ''; }
    // save for return for this status
    const stageDate = moment(activeStatusDate);
    // add passed days for next status
    activeStatusDate.add(passedDaysResult.passedDays, 'days');
    return stageDate.format('YYYY-MM-DD');
  });
};

export {
  getStagingDates,
};

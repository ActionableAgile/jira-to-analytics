import { IIssue } from '../../models';

const getStagingDates = (
    issue: IIssue,
    stages: string[],
    stageMap: Map<string, number>,
    createInFirstStage: boolean = true,
    resolvedInLastStage: boolean = false): string[] => {

  const unusedStages = new Map<string, number>();
  const stageBins: string[][] = stages.map(() => []); // todo, we dont need stages variable....just create array;

  if (createInFirstStage) {
    const creationDate: string = issue.fields.created;
    stageBins[0].push(creationDate);
  }

  if (resolvedInLastStage) {
    if (issue.fields.status !== undefined || issue.fields.status != null ) {
      if (issue.fields['status'].name === 'Closed') {
        if (issue.fields['resolutiondate'] !== undefined || issue.fields['resolutiondate'] != null) {
          const resolutionDate: string = issue.fields['resolutiondate'];
          const doneStageIndex: number = stageMap.get('Closed');
          stageBins[doneStageIndex].push(resolutionDate);
        }
      }
    }
  }

  // sort status changes into stage bins
  issue.changelog.histories.forEach(history => {
    history.items.forEach(historyItem => {
      if (historyItem.field === 'status') {
        const stageName: string = historyItem.toString;

        if (stageMap.has(stageName)) {
          const stageIndex: number = stageMap.get(stageName);
          const stageDate: string = history.created;
          stageBins[stageIndex].push(stageDate);
        } else {
          const count: number = unusedStages.has(stageName) ? unusedStages.get(stageName) : 0;
          unusedStages.set(stageName, count + 1);
        }
      }
    });
  });

  // get earliest date per stage and handle backflow
  let latestValidIssueDateSoFar: string = '';
  const stagingDates = stageBins.map((stageBin: string[], idx: number) => {
    let validStageDates: string[] = stageBin.filter(date => {
      return date >= latestValidIssueDateSoFar ? true : false;
    });

    if (validStageDates.length) {
      validStageDates.sort();
      latestValidIssueDateSoFar = validStageDates[validStageDates.length - 1];
      const earliestStageDate = validStageDates[0]; 
      return earliestStageDate.split('T')[0];
    } else {
      return '';
    }
  });
  return stagingDates;
};

export {
  getStagingDates,
}
import { JiraApiIssue, Workflow } from '../types';

var daysBlocked = 0;

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

const calculateDaysBlockedRounded = (blockedDifferenceInDays: number) => {
  // mulitply the blocked difference as a decimal of days by 100 and round up to the nearest whole number
  var roundedBlockedDiffToTwoDecimalPlaces = (Math.round((blockedDifferenceInDays*100)));
  // peel off the last digit, which would be the unit place value
  var lastdigit = roundedBlockedDiffToTwoDecimalPlaces.toString().split('').pop();
  if (lastdigit === "9") {
    // divide the whole unit difference by 10 round up to the nearest whole number and divide by 10
    blockedDifferenceInDays = Math.ceil(roundedBlockedDiffToTwoDecimalPlaces / 10)/10;
  }
  else {
    // divide the whole unit difference by 10 round down to the nearest whole number and divide by 10
    blockedDifferenceInDays = Math.floor(roundedBlockedDiffToTwoDecimalPlaces / 10)/10;
  }
  // using the above logic rounds the difference in days up by one 10th if the first two decimals are .85 of one day or higher.
  // it rounds down by one 10th if less than 0.85 of one day
  return blockedDifferenceInDays;
}

const populateStages = (issue: JiraApiIssue, stageMap, stageBins, blockedAttributes: Array<string>, unusedStages = new Map<string, number>()) => {
  var daysBlockedForCurrentIssue = 0;
  var currentBlockedDate = null;
  var blockedDateDifference = 0;

  var msecPerMinute = 1000 * 60;  
  var msecPerHour = msecPerMinute * 60;  
  var msecPerDay = msecPerHour * 24; 

  // sort status changes into stage bins
  issue.changelog.histories.forEach(history => {
    history.items.forEach(historyItem => {
      if (historyItem['field'] === 'status') {
        const stageName: string = historyItem.toString;
        if (stageMap.has(stageName)) {
          const stageIndex: number = stageMap.get(stageName);
          const stageDate: string = history['created'];
          stageBins[stageIndex].push(stageDate);
        } else {
          const count: number = unusedStages.has(stageName) ? unusedStages.get(stageName) : 0;
          unusedStages.set(stageName, count + 1);
        }
      }
      if (blockedAttributes.length > 0){
        if (blockedAttributes.indexOf(historyItem['field']) > -1) {  
          const fromString = historyItem['fromString'];
          const toString = historyItem['toString'];
          if (fromString === null && (toString != null || toString != "")) {
            currentBlockedDate = new Date(history['created']);
          }
          else if ((fromString != null || fromString != "") && (toString === null || toString === "")) {
            const endBlockedDate = new Date (history['created']);
            if (currentBlockedDate != null) {
              blockedDateDifference = endBlockedDate.valueOf() - currentBlockedDate.valueOf();
              daysBlockedForCurrentIssue += calculateDaysBlockedRounded(blockedDateDifference / msecPerDay);
            }
            currentBlockedDate = null;
          }
        }
      }
        
      // naive solution, does not differentiate between epic status stage or status stage/
      //  (lumpsthem together);
      const customAttributes = ['Epic Status'];
      if (customAttributes.includes(historyItem['field']) && historyItem['fieldtype'] === 'custom') {
        const stageName: string = historyItem.toString;
        if (stageMap.has(stageName)) {
          const stageIndex: number = stageMap.get(stageName);
          const stageDate: string = history['created'];
          stageBins[stageIndex].push(stageDate);
        } else {
          const count: number = unusedStages.has(stageName) ? unusedStages.get(stageName) : 0;
          unusedStages.set(stageName, count + 1);
        }
      }
    });
  });
  if (currentBlockedDate != null) {
    const endBlockedDate = new Date();
    blockedDateDifference = endBlockedDate.valueOf() - currentBlockedDate.valueOf();
    daysBlockedForCurrentIssue += calculateDaysBlockedRounded(blockedDateDifference / msecPerDay);
  }
  daysBlocked = daysBlockedForCurrentIssue;
  return stageBins;
};

const filterAndFlattenStagingDates = (stageBins: string[][]) => {
  let latestValidIssueDateSoFar: string = '';
  const stagingDates = stageBins.map((stageBin: string[], idx: number) => {
    let validStageDates: string[] = stageBin.filter(date => {
      // All dates are ISO 8601, so string comparison is fine
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

const fillInBlankStageDatesFromLatestDate = (stagingDates: string[]) => {
  var latestDate = '';
  for (var _i = stagingDates.length-1; _i >=0; _i--) {
    const currentDate = stagingDates[_i];
    if ( currentDate ) {
      latestDate = currentDate;
    } else {
      stagingDates[_i] = latestDate;
    }
  }
  return stagingDates;
}

const getStagingDates = (issue: JiraApiIssue, workflow: Workflow, blockedAttributes: Array<string>): string[] => {
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
  stageBins = populateStages(issue, stageMap, stageBins, blockedAttributes);
  var stagingDates = filterAndFlattenStagingDates(stageBins);
  stagingDates = fillInBlankStageDatesFromLatestDate(stagingDates);
  return stagingDates;
};

const getDaysBlocked = () => {
  return daysBlocked;
};

export {
  getStagingDates,
  getDaysBlocked,
};
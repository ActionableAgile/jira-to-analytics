 import { groupBy } from 'ramda';
 import { WorkItem } from '../../core/work-item'; 
 import { toCSV } from './exporter';
 import { 
   getBoardsFromAuthedUserUrl, 
   getBoardInformation, 
   getBoardHistory, 
   getBoardCards 
  } from './helpers';

class TrelloExtractor {

  private config: any = null;
  private workflow: Workflow = null;
  private key: string = null;
  private token: string = null;
  private baseUrl: string = null;

  constructor(key: string, token: string, baseUrl?) {
    this.config = mockConfig();
    this.key = key;
    this.token = token;
    this.baseUrl = baseUrl || 'https://api.trello.com';
  }

  public async getAuthedUsersProjects() {
    return await getBoardsFromAuthedUserUrl(this.baseUrl, { key: this.key, token: this.token });
  }

  public async getBoard(boardId: string) {
    return await getBoardInformation(boardId, this.baseUrl, { key: this.key, token: this.token });
  }

  public async getBoardHistory(boardId: string) {
    return await getBoardHistory(boardId, this.baseUrl, { key: this.key, token: this.token });
  }

  public async getBoardCards(boardId: string) {
    const cards = await getBoardCards(boardId, this.baseUrl, {key: this.key, token: this.token });
    if (cards.length >= 1000) {
      console.warn(`Warning, api fetching cards is capped at 1000, and we detect you may have more than that`);
    }
    return cards;
  }

  public async extractToCSV(boardId: string = '57182b1cbc0e38c4bf22beb1') {
    const { workflow } = this.config;

    const boards = await getBoardsFromAuthedUserUrl(this.baseUrl, { key: this.key, token: this.token });
    boards.forEach(board => console.log(`Board:\n\tName: ${board.name}\n\tID: ${board.id}`));

    const boardCards = await getBoardCards(boardId, this.baseUrl, { key: this.key, token: this.token });

    // Attach which list the action happened to to the action object (for every action in every card)...
    boardCards.forEach(card => {
      card.actions = card.actions.map(applyListToAction);
    });

    boardCards.forEach(card => {
      // CARD context...
      // note, because we are using groupBy, you can't have an event in two different stage categories

      // just so I don't forget:
      // a stage category is the key of workflow. the lists for a stage is the value.
      // i.e. {
      //    'ready': ['ready', 'very ready'],
      //    'in dev' ['coding', 'development', 'dev on-hold']
      // }
      // again, the key is a 'category' or 'group', 
      // and the value is the actual names of your trello boards you want to list under that category.
      const eventsByStageCategory = groupBy(action => {
        for (let stageCategory in workflow) {
          const listsForThisStage = workflow[stageCategory];
          if (listsForThisStage.includes(action.list.name)) {
            return stageCategory;
          }
        }
        return 'uncategorized';
      }, card.actions);

      const { uncategorized } = eventsByStageCategory;
      delete eventsByStageCategory['uncategorized'];

      const defaults: ActionsGroupedByWorkflowCategories = {};
      Object.keys(workflow).map(key => {
        defaults[key] = [];
      });

      // combine defaults and events, (fills in empty workflow categories with empty array [])
      const allStageCategoriesWithAllEvents = Object.assign(defaults, eventsByStageCategory);

      // map data to the input for algorithm...
      const accum: Array<Array<string>> = [];
      for (const stageCategory in allStageCategoriesWithAllEvents) {
        const dates = allStageCategoriesWithAllEvents[stageCategory].map(action => {
          return action.date;
        });
        accum.push(dates);
      }

      // get the latest date per array, and flatten.
      const stagingDates = filterAndFlattenStagingDates(accum);

      // add staging data to card object...
      card['stagingDates'] = stagingDates;
      return;
    });

    const workItems = boardCards.map(convertCardToWorkItem);
    const csvString = toCSV(workItems, Object.keys(workflow), {}, `${this.baseUrl}/c`);
    console.log(csvString);
    return csvString;
  }
}

// REFACTOR THIS....CODE SEMLL
const convertCardToWorkItem = (card: Card): IWorkItem => {
  return new WorkItem(card.id, card['stagingDates'], card.name, '', {}, 'TRELLO');
}

const fillOutMissingCategoriesWithEmptyArraysAndSort = (eventsByStageCategory: ActionsGroupedByWorkflowCategories, completeWorkflow: Workflow) => {
  const sortedEventsByStageCategory: ActionsGroupedByWorkflowCategories = {};
  Object.keys(completeWorkflow).forEach(stageCategory => {
    sortedEventsByStageCategory[stageCategory] = eventsByStageCategory[stageCategory] 
      ? eventsByStageCategory[stageCategory] 
      : [];
  });
  return sortedEventsByStageCategory;
}

const sortByWorklowCategory = (workflow) => (a, b) => {
  // in original order (straight from config...)
  const workflowCategories = Object.keys(workflow);
  const aIndex = workflowCategories.indexOf(a) !== -1 ? workflowCategories.indexOf(a) : Number.MAX_SAFE_INTEGER;
  const bIndex = workflowCategories.indexOf(b) !== -1 ? workflowCategories.indexOf(b) : Number.MAX_SAFE_INTEGER;
  return aIndex - bIndex;
};

const sortObject = (sortFn) => (o) => {
  return Object.keys(o).sort(sortFn).reduce((r, k) => (r[k] = o[k], r), {});
}

const mockConfig = (): Config => {
  return {
    workflow: {
      Ready: ['Ready'],
      'In Development': ['In Development'],
      Closed: ['Done', 'CLOSED_IN_TRELLO_INTERNAL_SYSTEM']
    }
  }
}

const filterAndFlattenStagingDates = (stageBins: string[][]) => {
  let latestValidIssueDateSoFar: string = '';
  const stagingDates = stageBins.map((stageBin: string[], idx: number) => {
    let validStageDates: string[] = stageBin.filter(date => {
      return date >= latestValidIssueDateSoFar ? true : false;
    });
    if (validStageDates.length) {
      validStageDates.sort();
      latestValidIssueDateSoFar = validStageDates[validStageDates.length - 1];
      const earliestStageDate = validStageDates[0]; 
      return earliestStageDate; 
    } else {
      return '';
    }
  });
  return stagingDates;
};

const applyListToAction = (action: Action) => {
  let list = null;
  if (action.type === 'updateCard') {
    if (action.data.list) {
      // Card closing
      // list = action.data.list;
      list = {
        name: 'CLOSED_IN_TRELLO_INTERNAL_SYSTEM',
        id: -1,
      };
      // data: { ... list: { name: 'Backlog', id: '57182d1853554d95f6b765ba' }, old: { closed: false },}
    } else {
      // Card being updated (moved from one list to another)
      list = action.data.listAfter;
      //   data: { listAfter: { name: 'Ready', id: '57182d3dd468e31d2f3cae77' },
      //      listBefore: { name: 'In Development', id: '5718314ceec0298d2f7d9e43' },
      //      old: { idList: '5718314ceec0298d2f7d9e43' } }, }
    }
  } else if (action.type === 'createCard') {
    // Card being created in certain list
    list = action.data.list;
    //   data: { list: { name: 'In Development', id: '5718314ceec0298d2f7d9e43' }, ... }
  } else {
    console.warn(`Unclassified action type: ${action.type}. Please report this to the owner of the code. This event will not be counted`, action);
  }
  return Object.assign({}, action, { list });
};

export {
  TrelloExtractor,
};





const filterEventsRecursive = (node, cardId, laneHashMap) => {
  // Null
  if (node === undefined || node === null) {
    return [];
  }

  // Leaf node
  if (node.ChildrenLaneIds == null || node.ChildrenLaneIds == undefined || node.ChildrenLaneIds.length === 0) {
    const leafNodeEvents = filterEvents(node, cardId);
    return leafNodeEvents;
  }

  // Node has children...
  // Children is an array of array of events. [[Events], [Events], [Events]]
  const childrenEvents: any[][] = node.ChildrenLaneIds.map(child => {
    const childEvents = filterEventsRecursive(child, cardId, laneHashMap);
    return childEvents;
  });

  const currentNodeEvents = filterEvents(node, cardId);

  // Combine Children and Current Node events and pass up...
  const finalArr = [];
  childrenEvents.forEach(childEvents => finalArr.push(...childEvents));
  finalArr.push(...currentNodeEvents);

  return finalArr;
};

const filterEvents = (node, cardId) : any[] => {
  const filteredEvents = node.Events.filter(event => {
    if (event.CardId == cardId) {
      return true;
    }
    return false;
  });
  return filteredEvents;
};

const getBoardIdFromName = async function(client, boardName) {
  const boards = await getBoards(client);
  const matchingBoard = boards.filter(board => board.Title === boardName);
  
  if (matchingBoard.length === 0) {
    return null;
  } else {
    return matchingBoard[0].Id;
  }
};

const getBoards = async function(client): Promise<any[]> {
  const boards = await client.getBoards();
  return boards;
};

const getLanes = async function(client, boardId) {
  const boardInfo = await client.getBoardIdentifiers(boardId);
  const lanes: any[] = boardInfo.Lanes;
  return lanes;
};

const getCardTypes = async function(client, boardId) {
  const boardInfo = await client.getBoardIdentifiers(boardId);
  const cardTypes: any[] = boardInfo.CardTypes;
  return cardTypes.map(cardType => {
    return {
      Id: cardType.Id, 
      Name: cardType.Name,
    }
  });
}

const getBoardInformation = async function(client, boardId): Promise<{}> {
  const boardInfo = await client.getBoardIdentifiers(boardId);
  const lanes: any[] = boardInfo.Lanes;
  return boardInfo;
};

const getAllHistorySinceSpecificVersion = async function(client, boardId, version = 0) {
  const history = await client.getBoardUpdates(boardId, version);
  return history;
};

const getAllCards = async function(client, boardId, customSearchOptions = {}) {
  const metadataCall = await searchCards(client, boardId, customSearchOptions);
  const totalCards = metadataCall['TotalResults'];

  let currentPage = 1;
  let cardArr = [];
  while ((currentPage - 1) * 20 < totalCards) {
    const cardJson = await searchCards(client, boardId, { Page: currentPage });
    const res = cardJson['Results'];
    cardArr.push(...res);
    currentPage++;
  };
  return cardArr;
};
    
const searchCards = async function(client, boardId, customSearchOptions = {}) {
  const defaultSearchOptions = {
    IncludeArchiveOnly: false,
    IncludeBacklogOnly: false,
    IncludeComments: false,
    IncludeDescription: false,
    IncludeExternalId: false,
    IncludeTags: false,
    AddedAfter: null,
    AddedBefore: null,
    CardTypeIds: [],
    ClassOfServiceIds: [],
    Page: 1,
    MaxResults: 20, //note: 20 is max, even if you put 100, it will get capped at 20...
    OrderBy: "CreatedOn",
    SortOrder: 0
  };
  const searchOptions = Object.assign({}, defaultSearchOptions, customSearchOptions);
  const cardJson = await client.searchCards(boardId, searchOptions);
  return cardJson;
};

const getCardHistory = async function(client, boardId, cardId) {
  const res = await client.getCardHistory(boardId, cardId);
  return res;
};

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

// const SampleLeanKitSettings: ILeanKitSettings = {
//   Connection: {
//     Domain: '',
//     Username: '',
//     Password: '',
//   },
//   Criteria: {
//     Projects: ['Welcome To LeanKit!'],
//     IssueTypes: ['New Feature', 'Improvement', 'LeanKit Information', 'Documentation', 'Defect', 'Subtask', 'risk / Issue'],
//   },
//   Workflow: {
//     'Backlog': ['Future Work'],
//     'Doing Now': ['Doing Now'],
//     'Recently Finished': ['Recently Finished'],
//     'Archive': ['Ready to Archive']
//   },
// };

export {
  filterEventsRecursive,
  filterEvents,
  getBoardIdFromName,
  getBoards,
  getLanes,
  getCardTypes,
  getBoardInformation,
  getAllHistorySinceSpecificVersion,
  getAllCards,
  searchCards,
  getCardHistory,
  filterAndFlattenStagingDates
};
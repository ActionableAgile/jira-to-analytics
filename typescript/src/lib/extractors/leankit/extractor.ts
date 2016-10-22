///<reference path="leankit-mock-typings.d.ts"/>
import * as clientfactory from 'leankit-client';
import * as moment from 'moment';
import { WorkItem } from '../../core/work-item';
import { toCSV } from './exporter';
import { 
  getBoards, 
  getBoardInformation, 
  getCardTypes, 
  getAllCards,
  getAllHistorySinceSpecificVersion, 
  getLanes, 
  filterEventsRecursive,
  filterAndFlattenStagingDates, 
} from './helpers';

class LeanKitExtractor {
  client = null;
  config: ILeanKitSettings = null;
  constructor(config?: ILeanKitSettings) {
    this.config = config;
    if (config && config.Connection) {
      this.client = getClient(
        config.Connection.Domain, 
        config.Connection.Username, 
        config.Connection.Password
      );
    }
  }

  getBoards = async function() {
    const boards: any[] = await getBoards(this.client);
    return boards;
  };
  
  getBoardInformation = async function(boardId) {
    const boardInfo: any = await getBoardInformation(this.client, boardId);
    return boardInfo;
  };

  run = async function(config: ILeanKitSettings) {
    const boardsWithFullDetails = await getBoards(this.client);
    const boards = boardsWithFullDetails.map(board => {
      return {
        Id: board.Id,
        Title: board.Title,
      };
    });
    const board = boards.filter(board => (board.Title.toLowerCase() === config.Criteria.Projects[0].toLowerCase()))[0];

    // break this apart.  what this does:
    // gets all card types that exist for the board
    // matches the user request card types (called issue types) with the board card type
    // if the board's card types' does not have a matching card type with an issue type that the user requested, we throw an error.
    // else, we return the matching card issue with the Name and Id.
    const cardTypes = await getCardTypes(this.client, board.Id).then(cardTypes => {
      return config.Criteria.IssueTypes.map(issueType => {
        const cardTypeInfo = cardTypes.find((cardType) => {
          return cardType.Name.toLowerCase() === issueType.toLowerCase();
        });
        if (!cardTypeInfo) {
          throw new Error(`Could not find issue type "${issueType}"`);
        }
        return {
          Name: cardTypeInfo.Name,
          Id: cardTypeInfo.Id,
        };
      });
    });

    // Get Card Types
    const cardTypesIds = cardTypes.map(cardType => cardType.Id);
    const searchOptions = { CardTypeIds: cardTypesIds };

    // All cards that are on that board with the card types requested;
    const cardsFullDetail = await getAllCards(this.client, board.Id, searchOptions);
    const cards = cardsFullDetail.map(card => {
      const { Title, LaneId, Id, TypeName } = card;
      const emptyArr = [];
      return {
        Title,
        LaneId,
        Id,
        TypeName,
        Events: emptyArr,
      };
    });

    // Set up getting card events
    const boardHistory: any[] = await getAllHistorySinceSpecificVersion(this.client, board.Id, 0);
    const currentBoardVersion = boardHistory['CurrentBoardVersion'];
    const events: any[] = boardHistory['Events'];
    // card movement events
    const cardEventsWithAllDetails = events.filter(event => {
      // cards don't 'close' in leankit, only archived...
      return (event.EventType == 'CardCreationEvent' || event.EventType == 'CardMoveEvent');
    });

    // Get Card Events
    const cardEvents = cardEventsWithAllDetails.map(cardEvent => {
      return {
        CardId: cardEvent.CardId,
        EventDateTime: cardEvent.EventDateTime,    
        ToLaneId: cardEvent.ToLaneId,
        FromLaneId: cardEvent.FromLaneId,
      };
    });

    // Create a look up with <cardId, card object> (just because its faster)
    const cardHashMap = new Map<string, any>();
    cards.forEach(card => {
      cardHashMap.set(card.Id, card);
    });

    // Add the events to all the cards.
    // Each card will have a list of events after this method...
    cardEvents.forEach(cardEvent => {
      if (cardHashMap.has(cardEvent.CardId)) {
        const card = cardHashMap.get(cardEvent.CardId);
        card.Events.push(cardEvent);
      }
    });

    const laneHashMap = new Map<string, any>();
    const lanes = await getLanes(this.client, board.Id);
    lanes.forEach(lane => {
      const emptyArrayForEvents = [];
      const emptyArrayForChildren = [];
      lane['Events'] = emptyArrayForEvents; // important
      lane['ChildrenLaneIds'] = emptyArrayForChildren
      laneHashMap.set(lane.Id, lane);
    });

    // add card events to the respective lanes
    cardEvents.forEach(cardEvent => {
      if (laneHashMap.has(cardEvent.ToLaneId)) {
        const lane = laneHashMap.get(cardEvent.ToLaneId);
        lane.Events.push(cardEvent);
      }
    });

    // build tree, with children nodes.
    lanes.forEach(lane => {
      if (lane.ParentLaneId == null) {
        return;
      } 
      const parent = laneHashMap.get(lane.ParentLaneId); 
      parent.ChildrenLaneIds.push(lane); 
    });

    const stageGroups = Object.keys(config.Workflow).map(stageGroupKey => {
      const stageGroup: string[] = config.Workflow[stageGroupKey];
      const stageGroupWithIds = stageGroup.map(stage => {
        const matchingLane = lanes.find(lane => {
          return (lane.Name.toLowerCase() === stage.toLowerCase());
        });
        if (!matchingLane) throw new Error(`Error: Could not find workflow stage ${stage}`);
    
        return matchingLane;
      });
      return stageGroupWithIds;
    });
    let totalCount = 0;
    // For each card/issue....
    const cardsWithFilteredEvents = cards.map(card => {
      // Map each stage group
      const cardStageGroupsEvents = stageGroups.map(stageGroup => {
        // Map each stag within the group
        const cardStageGroupEvents = stageGroup.map(stage => {
          const events = filterEventsRecursive(stage, card.Id, laneHashMap);
          return events;
        });
        const flattenedCardStageGroupEvents: any[] = [].concat.apply([],cardStageGroupEvents);
        return flattenedCardStageGroupEvents;
      });
      const cardWithFilteredEvents = Object.assign({}, card, { 'FilteredEvents': cardStageGroupsEvents });
      return cardWithFilteredEvents;
    });

    const cardsWithOnlyStagingDates: any[] = cardsWithFilteredEvents.map(card => {
      const onlyStagingDates =  card['FilteredEvents'].map(eventStages => {
        return eventStages.map(eventStage => {
          const rawDate: string = eventStage.EventDateTime;
          const formattedDate = moment(new Date(rawDate)).format('YYYY-MM-DD');
          return formattedDate; 
        });
      });
      const filteredStagingDates = filterAndFlattenStagingDates(onlyStagingDates);
      return Object.assign({}, card, { 'FormattedFilteredEvents': filteredStagingDates });
    });

    const workItems = cardsWithOnlyStagingDates.map(card => {
      const id: string = card.Id;
      const name: string = card.Title;
      const stagingDates: string[] = card.FormattedFilteredEvents;
      const type= card.TypeName ? card.TypeName : '';
      return new WorkItem(id, stagingDates, name, type, {}, 'LEANKIT');
    });

    const baseUrl = this.client._options.baseUrl;
    const fullUrl = `${baseUrl}Boards/View/${board.Id}`; // base url already includes backslash

    return {
      workItems,
      boardUrl: fullUrl
    };
  };

  driver = async function() {
    const { workItems, boardUrl } = await this.run(this.config);
    const csvString = toCSV(workItems, Object.keys(this.config.Workflow), {}, boardUrl);
    return csvString;
  }
};

const getClient = (domain, username, password) => {
  return new clientfactory(domain, username, password);
};

export {
  LeanKitExtractor,
};

import 'isomorphic-fetch';
const API_VERSION = '1'

const getBoardsFromAuthedUserUrl = async (baseUrl, options): Promise<Board[]> => {
  const resourceUrl = `${baseUrl}/${API_VERSION}/member/me/boards`;
  const { key, token } = options;
  if (key && token) {
    const url = addQueryParamsToUrl(resourceUrl, {key, token});
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    });
    const boards: Board[] = await response.json();
    return boards;
  } 
  console.log('No key and token found, no other auth is supported');
  throw new Error('Key and Token not found on options')
};

// theres also  /1/boards/[board_id]/lists
// https://developers.trello.com/advanced-reference/board#get-1-boards-board-id-cards
// see which one is better...
const getBoardInformation = async (boardId, baseUrl, options) => {
  const resourceUrl = `${baseUrl}/${API_VERSION}/boards/${boardId}`;
  const queryParams = Object.assign({}, options, { lists: 'all' });
  const url = addQueryParamsToUrl(resourceUrl, queryParams);

  const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    });
  const boardInfo: any = await response.json();
  return boardInfo;
};

const getBoardCards = async (boardId, baseUrl, options): Promise<Card[]> => {
  const resourceUrl = `${baseUrl}/${API_VERSION}/boards/${boardId}/cards`;
  const queryParams = Object.assign({}, options, { actions: 'createCard,updateCard:idList,updateCard:closed', filter: 'all', limit: '1000' });
  const url = addQueryParamsToUrl(resourceUrl, queryParams);
  const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    });
  const cards: Card[] = await response.json();
  return cards;
};

const getBoardHistory = async (boardId, baseUrl, options) => {
  const resourceUrl = `${baseUrl}/${API_VERSION}/boards/${boardId}/actions`;
  const queryParams = Object.assign({}, options, { filter: 'createCard,updateCard:idList,updateCard:closed', limit: '1000' });
  const url = addQueryParamsToUrl(resourceUrl, queryParams);
  const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    });
  const boardHistory: {
    id: string,
    idMemberCreator: string,
    data: {},
    type: string,
    date: string,
    memberCreator: any,
  }[] = await response.json();
  return boardHistory;
};


const addQueryParamsToUrl = (url: string, queryParamsObject: any): string => {
  const queryString: string = convertKeyValToQueryString(queryParamsObject);
  return `${url}?${queryString}`;
}

const convertKeyValToQueryString = (params: {}): string => {
  const esc = encodeURIComponent;
  const query: string = Object.keys(params)
    .map(k => esc(k) + '=' + esc(params[k]))
    .join('&');
  return query;
};

export {
  getBoardsFromAuthedUserUrl,
  getBoardInformation,
  getBoardHistory,
  getBoardCards,
};

// https://api.trello.com/1/member/me/boards?key=b4748080987d2552822fd08177e37df3&token=a8212d0022c49d1fc320e11a006a69cb77fd07792d6a31e47caebe7e1e42a0e1

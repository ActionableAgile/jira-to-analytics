import * as inquirer from 'inquirer';
import * as clientfactory from 'leankit-client';
import { getBoards, getCardTypes, getLanes } from '../extractors/leankit/helpers';


const getBoardList = async function(currentAnswers) {
  const client = new clientfactory(`${currentAnswers.domainUrl}`,`${currentAnswers.username}`, `${currentAnswers.password}` );  
  const boards = await getBoards(client);

  // const question
  // console.log(boards);
  return boards;
};


const questions: any[]= [
  {
    type: 'input',
    name: 'domainUrl',
    message: 'Enter the url of your LeanKit board, then press enter. (example: "https://myboard.leankit.com/")\n',
    validate: (value): any => {
      if (value) return true;
      return 'Please enter a valid url';
    }
  },
  {
    type: 'input',
    message: 'Enter your username',
    name: 'username'
  },
  {
    message: 'Enter your LeanKit password',
    type: 'password',
    name: 'password'
  },
  {
    type: 'list',
    message: 'Choose your board (use the up/down arrow keys to choose a project then press enter)\n',
    choices: async function (answers): Promise<any> {
      try {
        const boards = await getBoardList(answers);
        return boards.map(board => board.Title);
      } catch (err) {
        throw new Error(`
          Error connecting. Please check the url, username, and password provided.
          ${err}
          Error connecting. Please check the url, username, and password provided. \n
        `);
      }
    },
    name: 'board'
  },
];

const getBoardId = async function(client, boardName) {
  const boards = await getBoards(client);
  const board = boards.filter(board => board.Title === boardName)[0];
  return board.Id;
};

const getIssueTypes = async function(client, boardId) {
  const cardTypes = await getCardTypes(client, boardId);
  return cardTypes.map(cardType => cardType.Name);
};

const getWorkflow = async function(client, boardId) {
  const lanes = await getLanes(client, boardId);
  const topLevelParentLanes = lanes.filter(lane => {
    if (lane['TopLevelParentLaneId'] == null) {
      return true;
    } else {
      return false;
    }
  });

  let workflow = {};
  topLevelParentLanes.forEach(topLevelParentLane => {
    workflow[topLevelParentLane.Name] = [topLevelParentLane.Name];
  });
  return workflow;
};


const setup = async function() {
  const answers = await inquirer.prompt(questions);

  const client = clientfactory(answers['domainUrl'], answers['username'], answers['password']);

  const boardId = await getBoardId(client, answers['board']);
  const issueTypes = await getIssueTypes(client, boardId);
  const workflow = await getWorkflow(client, boardId);

  const leanKitSettings = {
    Connection: {
      Domain: answers['domainUrl'],
      Username: answers['username'],
      Password: answers['password'],
    },
    Criteria: {
      Projects: [answers['board']],
      IssueTypes: issueTypes
    },
    Workflow: workflow,
  };
  return leanKitSettings;

};

export {
  setup,
};
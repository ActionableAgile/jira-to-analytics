interface Board {
  name: string;
  id: string;
  url: string;
};

interface Card {
  id: string;
  due: string;
  closed: boolean;
  name: string;
  labels: Array<any>;
  url: string;
  actions: Array<Action>;
};

interface Action {
  id: string;
  idMemberCreator: string;
  data: any;
  type: string;
  date: string;
  memberCreator: any;
  list?: {
    id: string;
    name: string;
  }
}

interface Workflow {
  [category: string]: Array<string>;
}

interface ActionsGroupedByWorkflowCategories {
  [category: string]: Array<Action>;
}

interface Config {
    workflow: Workflow;
}
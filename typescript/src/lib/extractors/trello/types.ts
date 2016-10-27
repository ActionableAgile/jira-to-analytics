export interface Board {
  name: string;
  id: string;
  url: string;
};

export interface Card {
  id: string;
  due: string;
  closed: boolean;
  name: string;
  labels: Array<any>;
  url: string;
  actions: Array<Action>;
};

export interface Action {
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

export interface Workflow {
  [category: string]: Array<string>;
}

export interface ActionsByWorkflow {
  [workflowCategory: string]: Array<Action>;
}

export interface Config {
    workflow: Workflow;
}
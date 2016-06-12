export interface IChangeLog {
  total: number;
  histories: Array<IHistory>;
};

export interface IHistory {
  id: string;
  items: Array<IItem>;
  created: string;
};

export interface IIssue {
  key: string;
  fields: any;
  changelog: IChangeLog;
};

export interface IIssueList {
  issues: Array<IIssue>;
};

export interface IItem {
  field: string;
  toString: string;
};

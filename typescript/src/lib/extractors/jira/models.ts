interface IItem {
  field: string;
  toString: string;
};

interface IHistory {
  id: string;
  items: Array<IItem>;
  created: string;
};

interface IChangeLog {
  total: number;
  histories: Array<IHistory>;
};

interface IIssue {
  key: string;
  fields: any;
  changelog: IChangeLog;
};

interface IIssueList {
  issues: Array<IIssue>;
};

export {
  IItem,
  IHistory,
  IChangeLog,
  IIssue,
  IIssueList,
};

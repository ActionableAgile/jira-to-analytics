interface IIssue {
  key: string;
  fields: any;
  changelog: IChangeLog;
};

interface IIssueList {
  issues: Array<IIssue>;
};

interface IChangeLog {
  total: number;
  histories: Array<IHistory>;
};

interface IHistory {
  id: string;
  items: Array<IItem>;
  created: string;
};

interface IItem {
  field: string;
  toString: string;
};

interface IWorkItem {
  Id: string;
  StageDates: string[];
  Name: string;
  Type: string;
  Attributes: {};
};

class WorkItem implements IWorkItem {
  Id: string;
  StageDates: string[];
  Name: string;
  Type: string;
  Attributes: {};
  constructor(id: string, stageDates: string[], name: string, type: string, attributes: {}) {
    this.Id = id;
    this.StageDates = stageDates;
    this.Name = name;
    this.Type = type;
    this.Attributes = attributes;
  }

  toCSV(): string {
    let s = '';
    s += `${this.Id},`;
    s += `,${(WorkItem.cleanString(this.Name))}`;
    this.StageDates.forEach(stageDate => s += `,${stageDate}`);
    s += `,${this.Type}`;

    const attributeKeys = Object.keys(this.Attributes);
    attributeKeys.forEach(attributeKey => {
      s += `,${WorkItem.cleanString(this.Attributes[attributeKey])}`;
    });

    return s;
  }

  static cleanString(s: string): string {
    return s.replace(/"/g, '')
    .replace(/'/g, '')
    .replace(/,/g, '')
    .replace(/\\/g, '')
    .trim();
  }
};

export {
  IIssueList,
  IIssue,
  IWorkItem,
  WorkItem,
};

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

export interface IWorkItem {
  Id: string;
  StageDates: string[];
  Name: string;
  Type: string;
  Attributes: {};
};

export class WorkItem implements IWorkItem {
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

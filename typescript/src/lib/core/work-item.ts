import { IWorkItem } from './types';
class WorkItem implements IWorkItem {
  Id: string;
  StageDates: Array<string>;
  Name: string;
  Type: string;
  Attributes: any;
  Source: string;
  constructor(id: string = '', stageDates: string[] = [], name: string = '', type: string = '', attributes: {} = {}, source: string = 'JIRA') {
    this.Id = id;
    this.StageDates = stageDates;
    this.Name = name;
    this.Type = type;
    this.Attributes = attributes;
    this.Source = source;
  }

  toCSV(domainUrl: string, config: any = {}): string {
    let s = '';
    s += `${this.Id},`;

    if (this.Source.toUpperCase() === 'LEANKIT' || this.Source.toUpperCase() === 'TRELLO') {
      s += `${domainUrl}/${this.Id},`;
    } else { // it is JIRA
      if (config.FeatureFlags && config.FeatureFlags['MaskLink']) {
        s += ',';
      } else {
        s += `${domainUrl}/browse/${this.Id},`;
      }
    }
    s += `${(WorkItem.cleanString(this.Name))}`;
    this.StageDates.forEach(stageDate => s += `,${stageDate}`);
    s += `,${this.Type}`;

    const attributeKeys = Object.keys(this.Attributes);

    if (attributeKeys.length === 0) {
      s += ',';
    } else {
      attributeKeys.forEach(attributeKey => {
        s += `,${WorkItem.cleanString(this.Attributes[attributeKey])}`;
      });
    }

    return s;
  }

  toSerializedArray(): string {
    let s = '';
    s += '['
    s += `"${this.Id}",`;
    s += `"",`
    s += `"${(WorkItem.cleanString(this.Name))}"`;
    this.StageDates.forEach(stageDate => s += `,"${stageDate}"`);
    s += `,"${this.Type}"`;

    const attributeKeys = Object.keys(this.Attributes);
    attributeKeys.forEach(attributeKey => {
      s += `,"${WorkItem.cleanString(this.Attributes[attributeKey])}"`;
    });
    s += ']';

    return s;
  };


  static cleanString(s: string = ''): string {
    return s.replace(/"/g, '')
    .replace(/'/g, '')
    .replace(/,/g, '')
    .replace(/\\/g, '')
    .trim();
  };
};

export {
  WorkItem,
};

export interface IWorkItem {
  Id: string;
  StageDates: Array<string>;
  Name: string;
  Type: string;
  Attributes: any;
  toCSV(string?);
  toSerializedArray();
};


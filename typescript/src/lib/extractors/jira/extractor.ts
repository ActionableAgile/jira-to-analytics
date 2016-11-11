import { extractBatchFromConfig, extractAllFromConfig } from './components/extract';
import { importConfig } from './components/import-config';
import { IWorkItem } from '../../core/types';
import { IJiraSettings} from './types';


class JiraExtractor {
  config: IJiraSettings = null;

  batchSize: number;

  constructor(config?: IJiraSettings) {
    this.config = config;
  };

  setConfig(c: IJiraSettings) {
    this.config = c;
    return this;
  };

  setBatchSize(x: number) {
    this.batchSize = x;
    return this;
  };

  importSettings(configObjToImport, source) {
    const config = importConfig(configObjToImport, source);
    this.setConfig(config);
    return this;
  };

  extractAll = async function(statusHook?) {
    const batchSize = this.batchSize || 25;
    const hook = statusHook || (() => {});
    return extractAllFromConfig(this.config, batchSize, hook);
  };

  extractBatch = async function(batchSize?, startIndex = 0) {
    return extractBatchFromConfig(this.config, startIndex, batchSize);
  };

  toCSV(workItems, withHeader?) {
    return toCSV(workItems, Object.keys(this.config.Workflow), this.config.Attributes, this.config.Connection.Domain, withHeader, this.config);
  };

  toSerializedArray(workItems, withHeader?) {
    return toSerializedArray(workItems, Object.keys(this.config.Workflow), this.config.Attributes, withHeader);
  };
};

export {
  JiraExtractor,
};


const toCSV = (workItems: IWorkItem[], stages: string[], attributes: {}, domainUrl: string, withHeader: boolean = true, config: any = {}): string => {
  if (attributes === undefined || attributes === null) {
    attributes = {};
  }
  const header = `ID,Link,Name,${stages.join(',')},Type,${Object.keys(attributes).join(',')}`;
  const body = workItems.map(item => item.toCSV(domainUrl, config)).reduce((res, cur) => `${res + cur}\n`, '');
  const csv: string = `${header}\n${body}`;
  return csv;
};

const toSerializedArray = (workItems: IWorkItem[], stages: string[], attributes: {}, withHeader: boolean = true): string => {
  const header = `["ID","Link","Name",${stages.map(stage => `"${stage}"`).join(',')},"Type",${Object.keys(attributes).map(attribute => `"${attribute}"`).join(',')}]`;
  const body = workItems.map(item => item.toSerializedArray()).reduce((res, cur) => `${res},\n${cur}`, '');
  const serializedData: string = `[${header}${body}]`;
  return serializedData;
};

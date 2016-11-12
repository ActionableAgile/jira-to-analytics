import { extractBatchFromConfig, extractAllFromConfig } from './components/extract';
import { IWorkItem } from '../../core/types';
import { IJiraSettings} from './types';
import { convertYamlToJiraSettings } from './components/yaml-converter';


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
    switch (source.toUpperCase()) {
      case 'YAML':
        const parsedSettings = convertYamlToJiraSettings(configObjToImport);
        const { Connection, Attributes, Criteria, Workflow, FeatureFlags } = parsedSettings;
        const jiraSettings: IJiraSettings = {
          Connection,
          Attributes,
          Criteria,
          Workflow,
          FeatureFlags,
        };
        const config = jiraSettings;
        this.setConfig(config);
        return this;
      default:
        throw new Error(`${source} source not found`);
    }
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

    let attributes = this.config.Attributes;
    let stages = Object.keys(this.config.Workflow);
    let domainUrl = this.config.Connection.Domain;
    let config = this.config;

    if (attributes === undefined || attributes === null) {
      attributes = {};
    }
    const header = `ID,Link,Name,${stages.join(',')},Type,${Object.keys(attributes).join(',')}`;
    const body = workItems.map(item => item.toCSV(domainUrl, config)).reduce((res, cur) => `${res + cur}\n`, '');
    const csv: string = `${header}\n${body}`;
    return csv;


  };

  toSerializedArray(workItems, withHeader?) {
    let stages = Object.keys(this.config.Workflow);
    let attributes = this.config.Attributes;

    const header = `["ID","Link","Name",${stages.map(stage => `"${stage}"`).join(',')},"Type",${Object.keys(attributes).map(attribute => `"${attribute}"`).join(',')}]`;
    const body = workItems.map(item => item.toSerializedArray()).reduce((res, cur) => `${res},\n${cur}`, '');
    const serializedData: string = `[${header}${body}]`;
    return serializedData;
  };
};

export {
  JiraExtractor,
};


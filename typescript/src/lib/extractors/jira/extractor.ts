import { getAllWorkItemsFromJiraApi } from './api-adapter/main';
import { IJiraSettings, JiraSettings } from './settings'
import { IWorkItem } from '../../core/work-item';

class JiraExtractor {
  private settings: IJiraSettings;
  private statusHook: any;
  private workItems: Array<IWorkItem>;

  constructor(settings: IJiraSettings, statusHook: any = () => {}) {
    if (!settings) {
      throw new Error('No JIRA Settings found. Must provide settings');
    }

    const stages = Object.keys(settings.Workflow);
    const stageMap = stages.reduce((map: Map<string, number>, stage: string, i: number) => {
      return settings.Workflow[stage].reduce((map: Map<string, number>, stageAlias: string) => {
        return map.set(stageAlias, i);
      }, map);
    }, new Map<string, number>());

    this.settings = settings;
    this.settings.StageMap = stageMap;
    this.settings.Stages = stages;
    this.statusHook = statusHook;
  }

  getWorkItems(): Promise<any> {
    return new Promise((accept, reject) => {
      getAllWorkItemsFromJiraApi(this.settings, this.statusHook)
      .then(items => {
        this.workItems = items;
        accept(items);
      }).catch(err => {
        reject(err);
      });
    });
  };

  getWorkItemBatch(): Promise<any> {
    return null;
  };

  testConnectionToJira(): Promise<any> {
    return null;
  }

  getWorkItemMetadata(): Promise<any> {
    return null;
  }


  toCSV(workItems = this.workItems, stages = this.settings.Stages, attributes = this.settings.Attributes): string {
    const header = `ID,Link,Name,${stages.join(',')},Type,${Object.keys(attributes).join(',')}`;
    const body = workItems.map(item => item.toCSV()).reduce((res, cur) => `${res + cur}\n`, '');
    const csv = `${header}\n${body}`;
    return csv;
  }

  toSerializedArray(workItems = this.workItems, stages = this.settings.Stages, attributes = this.settings.Attributes): string {
    const header = `["ID","Link","Name",${stages.map(stage => `"${stage}"`).join(',')},"Type",${Object.keys(attributes).map(attribute => `"${attribute}"`).join(',')}]`;
    const body = workItems.map(item => item.toSerializedArray()).reduce((res, cur) => `${res},\n${cur}`, '');
    const serializedData: string = `[${header}${body}]`;
    return serializedData;
  }
};

export {
  JiraExtractor,
  JiraSettings,
};

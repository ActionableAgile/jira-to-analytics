import { getAllWorkItemsFromJiraApi } from './api-adapter/main';
import { IJiraSettings } from './settings'
import { IWorkItem } from '../core/work-item';

class JiraExtractor {
  private settings: IJiraSettings;
  private workItems: Array<IWorkItem>;

  constructor(settings: IJiraSettings) {
    if (!settings) {
      throw new Error('No JIRA Settings found. Must provide settings');
    }
    this.settings = settings;
  }

  getWorkItems(settings = this.settings): Promise<any> {
    return new Promise((accept, reject) => {
      getAllWorkItemsFromJiraApi(settings)
      .then(items => {
        this.workItems = items;
        accept(items);
      });
    });
  };

  toCSV(workItems = this.workItems, stages = this.settings.Stages, attributes = this.settings.Attributes) {
    const header = `ID,Link,Name,${stages.join(',')},Type,${Object.keys(attributes).join(',')}`;
    const body = workItems.map(item => item.toCSV()).reduce((res, cur) => `${res + cur}\n`, '');
    const csv = `${header}\n${body}`;
    return csv;
  }
};

export {
  JiraExtractor,
};

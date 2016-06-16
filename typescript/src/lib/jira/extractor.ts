import { getAllWorkItemsFromJira } from './repository';
import { IJiraSettings } from './settings';
import { IWorkItem, IExtractor } from '../core/models';

class JiraExtractor implements IExtractor {
  private settings: IJiraSettings;
  private workItems: IWorkItem[];

  constructor(settings: IJiraSettings) {
    if (!settings) {
      throw new Error('No JIRA Settings found. Must provide settings');
    }
    this.settings = settings;
  }

  async getWorkItems(settings = this.settings): Promise<void> {
    try {
      const items = await getAllWorkItemsFromJira(settings);
      this.workItems = items;
    } catch (e) {
      throw e;
    }
  }

  toCSV(workItems = this.workItems, stages = this.settings.Stages, attributes = this.settings.Attributes) {
    const header = `ID,Link,Name,${stages.join(',')},Type,${Object.keys(attributes).join(',')}`;
    const body = workItems.map(item => item.toCSV()).reduce((res, cur) => `${res + cur}\n`, '');
    const csv = `${header}\n${body}`;
    return csv;
  }
}

export default JiraExtractor;

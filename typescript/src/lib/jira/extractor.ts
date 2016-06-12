import { getAllWorkItemsFromJira } from './repository';
import { JiraSettings } from './settings';
import { WorkItem,  IExportable, IExtractor } from '../core/models';

class JiraExtractor implements IExtractor {
  private settings: JiraSettings;
  private workItems: WorkItem[];
  constructor(settings: JiraSettings) {
    if (!settings) {
      throw new Error('Must provide settings');
    }
    this.settings = settings;
  }

  async getWorkItems(settings = this.settings): Promise<void> {
    try {
      const items = await getAllWorkItemsFromJira(settings);
      this.workItems = items;
      return;
    } catch (error) {
      console.warn('Error in JiraExtractor');
      console.log(error);
      throw error;
    }
  }

  //todo refactor this so it doesnt depend on settings.jira 
  toCSV(workItems = this.workItems, stages = this.settings.Stages, attributes = this.settings.Attributes) {
    const header = `ID,Link,Name,${stages.join(',')},Type,${Object.keys(attributes).join(',')}`;
    const body = workItems.map(item => item.toCSV()).reduce((res, cur) => `${res + cur}\n`, '');
    const csv = `${header}\n${body}`;
    return csv;
  }
}

export default JiraExtractor;

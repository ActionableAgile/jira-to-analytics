import { getAllWorkItems } from './lib/jira/repository';
import { WorkItem } from './lib/jira/models';
import { JiraSettings, IJiraSettings } from './lib/jira/settings';

class Extractor {
  private settings: any;
  JiraSettings: IJiraSettings
  private workItems: WorkItem[];
  constructor(userSettings) {
    if (!userSettings) {
      throw new Error('Must provide settings');
    }
    this.settings = {};
    this.computeSettings(userSettings);
  }

  computeSettings(settings) {
    if (settings.jira) {
      console.log(settings);
      const jiraSettings = new JiraSettings(settings.jira, settings.jira.source);
      this.JiraSettings = jiraSettings;
      this.settings.jira = jiraSettings;
    } else {
      console.log('No jira settings detected. No other settings supported at this time');
      throw new Error('Missing JIRA configuration');
    }
  }

  async extractWorkItems(settings = this.settings): Promise<void> {
    try {
      const items = await getAllWorkItems(settings.jira);
      this.workItems = items;
      return;
    } catch (error) {
      console.warn('Error in JiraExtractor');
      console.log(error);
      throw error;
    }
  }

  toCSV(workItems = this.workItems, stages = this.JiraSettings.Stages, attributes = this.JiraSettings.Attributes) {
    const header = `ID,Link,Name,${stages.join(',')},Type,${Object.keys(attributes).join(',')}`;
    const body = workItems.map(item => item.toCSV()).reduce((res, cur) => `${res + cur}\n`, '');
    const csv = `${header}\n${body}`;
    return csv;
  }
}

export default Extractor;

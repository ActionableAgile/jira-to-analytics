import { getAllWorkItems } from './lib/repository';
import { WorkItem } from './lib/models';

class JiraExtractor {
  constructor(userSettings) {
    if (!userSettings) {
      throw new Error('Must provide settings');
    }
    this.settings = this.computeSettings(userSettings);
  }
  private settings: any;
  private workItems: WorkItem[];
  private defaults = {
    batchSize: 25,
    maxTries: 5,
    retryDelay: 5,
    apiSuffix: '/rest/api/latest',
  };

  computeSettings(userSettings) {
    const stages = Object.keys(userSettings.workflow);
    const stageMap = stages.reduce((map, stage, i) => {
      return userSettings.workflow[stage].reduce((map, stageAlias) => {
        return map.set(stageAlias, i);
      }, map);
    }, new Map<string, number>());

    const createInFirstStage = stageMap.get('(CREATED)') === 0 ? true : false;
    const resolvedInLastStage = stageMap.get('(RESOLVED)') === stages.length - 1 ? true : false;
    if (stageMap.get('(RESOLVED)') && stageMap.get('(RESOLVED)') != stages.length - 1) {
      throw new Error('(RESOLVED) can only by used in last stage');
    }

    const urlRoot = `${userSettings.url}${this.defaults.apiSuffix}`;

    const computedSettings = {
      stages,
      stageMap,
      urlRoot,
      createInFirstStage,
      resolvedInLastStage,
    };

    const settings = Object.assign({}, this.defaults, userSettings, computedSettings);
    return settings;
  }

  async extractWorkItems(overrideSettings = {}): Promise<void> {
    const mergedSettings = Object.assign(this.settings, overrideSettings);

    try {
      const items = await getAllWorkItems(mergedSettings);
      this.workItems = items;
      return;
    } catch (error) {
      console.warn('Error in JiraExtractor');
      console.log(error);
      throw error;
    }
  }

  toCSV(workItems = this.workItems, stages = this.settings.stages, attributes = this.settings.attributes) {
    const header = `ID,Link,Name,${stages.join(',')},Type,${Object.keys(attributes).join(',')}`;
    const body = workItems.map(item => item.toCSV()).reduce((res, cur) => `${res + cur}\n`, '');
    const csv = `${header}\n${body}`;
    return csv;
  }

}

export default JiraExtractor;

import { convertYamlToJiraSettings } from './yaml-converter';

const importConfig = (config: any, source: string): IJiraSettings => {
  switch (source.toUpperCase()) {
    case 'YAML':
      const parsedSettings = convertYamlToJiraSettings(config);
      const { Connection, Attributes, Criteria, Workflow } = parsedSettings;
      const jiraSettings: IJiraSettings = {
        Connection,
        Attributes,
        Criteria,
        Workflow,
      };
      return jiraSettings;
    default:
      throw new Error(`${source} source not found`);
  }
};

export { 
  importConfig,
};
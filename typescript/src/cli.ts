import * as fs from 'fs';
import { JiraExtractor, JiraSettings } from './main';
import { safeLoad } from 'js-yaml';
import { argv } from 'yargs';

const defaultYamlPath = 'config.yaml';
const defaultOutputPath = 'output.csv';

const getArgs = () => {
  return argv;
};

const log = (data: any) => {
  console.log(data)
};

const writeFile = (filePath, data) =>
  new Promise((accept, reject) => {
    fs.writeFile(filePath, data, (err => {
      if (err) {
        console.log(`Error writing file to ${filePath}`);
        return reject(err);
      }
      accept();
    }));
  });

const run = async function(cliArgs: any): Promise<void> {
  const start = new Date().getTime();

  log('Parsing settings');
  // Parse CLI settings
  let jiraConfigPath: string = cliArgs.i ? cliArgs.i : defaultYamlPath;
  let isLegacyYaml: boolean = cliArgs.l ? true : false;
  let outputPath: string = cliArgs.o ? cliArgs.o : defaultOutputPath;
  let outputType: string = outputPath.split('.')[1].toUpperCase();
  if (outputType !== 'CSV') {
    throw new Error('Only CSV is currently supported. JSON support coming soon');
  }

  // Parse YAML settings
  let settings: any  = {};
  try {
    let yamlConfig = safeLoad(fs.readFileSync(jiraConfigPath, 'utf8'));
    settings = yamlConfig;
    settings.legacy = isLegacyYaml;
  } catch (e) {
    console.log(`Error parsing settings ${e}`);
    throw e;
  }
  const jiraSettings = new JiraSettings(settings, 'yaml');
  console.log('Successfully parsed settings');
  
  // Import data
  log('Beginning extraction process');
  const jiraExtractor = new JiraExtractor(jiraSettings);
  try {
    await jiraExtractor.getWorkItems();
  } catch (e) {
    console.log(`Error extracting JIRA Items ${e}`);
    throw e;
  }

  // Export data
  let data: string;
  if (outputType === 'CSV') {
    data = jiraExtractor.toCSV();
  }
  try {
    await writeFile(outputPath, data);
  } catch (e) {
    console.log(`Error writing jira data to ${outputPath}`);
  }

  const end = new Date().getTime();
  log(`Completed extraction in ${(end - start) / 1000} seconds`);
  return;
};

(async function(args): Promise<void> {
  try {
    await run(args);
  } catch (e) {
    console.log(`Error running ActionableAgile Command Line Tool`)
    console.log(e);
  }
}(getArgs()));


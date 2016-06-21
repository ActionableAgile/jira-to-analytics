import * as fs from 'fs';
import { JiraExtractor, JiraSettings } from './main';
import { safeLoad } from 'js-yaml';
import { argv } from 'yargs';

const legacySampleYamlPath = './src/config/config-v1.yaml';
const sampleYamlPath = './src/config/config-v2.yaml';

const getArgs = () => {
  const runtimeSettings: any = {};
  if (argv['legacy']) {
    runtimeSettings.legacy = argv['legacy'];
  }
  return runtimeSettings;
};

const log = (l: any) => {
  console.log(l);
};

const run = async function(cliSettings: any): Promise<void> {
  log('Extractor starting up...');
  const start = new Date().getTime();

  log('Parsing settings');
  let settings: any  = {};
  try {
    let jiraConfigPath = cliSettings.legacy ? legacySampleYamlPath : sampleYamlPath;
    let yamlConfig = safeLoad(fs.readFileSync(jiraConfigPath, 'utf8'));
    settings = yamlConfig;
    settings.legacy = cliSettings.legacy ? true : false;
  } catch (error) {
    console.log('Error parsing config');
    throw error;
  }
  
  const jiraSettings = new JiraSettings(settings, 'yaml');
  log('Settings parsed successfully');

  log('Beginning extraction process');
  const jiraExtractor = new JiraExtractor(jiraSettings);
  await jiraExtractor.getWorkItems();
  const csv = jiraExtractor.toCSV();

  try {
    await writeFile('output.csv', csv);
  } catch (error) {
    console.log('Error writing out CSV.');
    throw error;
  }

  const end = new Date().getTime();
  log(`Completed extraction in ${(end - start) / 1000} seconds`);
  return;
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

(async function(cliArgs): Promise<void> {
  try {
    await run(cliArgs);
  } catch (error) {
    console.log(error);
  }
}(getArgs()));

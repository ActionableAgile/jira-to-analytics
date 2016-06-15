import * as fs from 'fs';
import { JiraExtractor, JiraSettings } from './main';
import { safeLoad } from 'js-yaml';
import { argv } from 'yargs';

const legacySampleYamlPath = './src/config/oldconfig.yaml';
const sampleYamlPath = './src/config/config.yaml';

const getArgs = () => {
  const runtimeSettings: any = {};
  if (argv['legacy']) {
    runtimeSettings.legacy = argv['legacy'];
  }
  return runtimeSettings;
};


const run = async function(cliSettings: any) {
  const start = new Date().getTime();

  let settings: any  = {};
  try {
    let jiraConfigPath = cliSettings.legacy  ? legacySampleYamlPath : sampleYamlPath;
    let yamlConfig = safeLoad(fs.readFileSync(jiraConfigPath, 'utf8'));
    settings = yamlConfig;
    settings.legacy = cliSettings.legacy ? true : false;
  } catch (error) {
    console.log('Error parsing config');
    throw error;
  }

  const jiraSettings = new JiraSettings(settings, 'yaml');
  const jiraExtractor = new JiraExtractor(jiraSettings);
  await jiraExtractor.getWorkItems();
  const csv = jiraExtractor.toCSV();

  try {
    await writeOutData('output.csv', csv);
  } catch (error) {
    console.log('Error writing out CSV.');
    throw error;
  }

  const end = new Date().getTime();
  console.log(`${(end - start) / 1000} seconds`);
  return;
};

const writeOutData = (filePath, data) =>
  new Promise((accept, reject) => {
    fs.writeFile(filePath, data, (err => {
      if (err) {
        console.log(`Error writing file to ${filePath}`);
        return reject(err);
      }
      accept();
    }));
  });

(async function(cliArgs) {
  try {
    await run(cliArgs);
  } catch (error) {
    console.log(error);
  }
}(getArgs()));

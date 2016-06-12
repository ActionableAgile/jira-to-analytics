import * as fs from 'fs';
import { JiraExtractor, JiraSettings } from './main';
import { safeLoad } from 'js-yaml';
import { argv } from 'yargs';


// this should work
const legacy: boolean = argv['legacy'];

const legacySampleYamlPath = './src/config/oldconfig.yaml';
const sampleYamlPath = './src/config/config.yaml';

const run = async function(legacy: boolean = false) {
  console.log(legacy);
  const start = new Date().getTime();

  let settings = {};

  try {
    let jiraConfigPath = legacy ? legacySampleYamlPath : sampleYamlPath;
    let yamlConfig = safeLoad(fs.readFileSync(jiraConfigPath, 'utf8'));
    settings = yamlConfig;
  } catch (error) {
    console.log('Error parsing config');
    throw error;
  }

  settings['legacy'] = legacy;
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

(async function(legacy) {
  try {
    await run(legacy);
  } catch (error) {
    console.log(error);
  }
}(legacy));

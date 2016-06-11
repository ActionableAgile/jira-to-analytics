import * as fs from 'fs';
import Extractor from './extractor';
import { safeLoad } from 'js-yaml';

const legacySampleYamlPath = './src/config/oldconfig.yaml';
const sampleYamlPath ='./src/config/config.yaml'

const run = async function(legacy: boolean = false) {
  const start = new Date().getTime();

  const settings = {};
  try {
    let jiraConfigPath = legacy ? legacySampleYamlPath : sampleYamlPath;
    let jiraConfig = safeLoad(fs.readFileSync(jiraConfigPath, 'utf8'));
    
    settings['jira'] = jiraConfig;
    settings['jira']['source'] = 'yaml';
    settings['jira']['legacy'] = legacy;
  } catch (error) {
    console.log(error);
  }

  const jiraExtractor = new Extractor(settings);
  await jiraExtractor.extractWorkItems();
  const csv = jiraExtractor.toCSV();

  try {
    await writeOutData('output.csv', csv);
  } catch (error) {
    console.log('Error writing out CSV.');
    console.log('Dumping CSV below:');
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

(async function() {
  try {
    await run();
  } catch (error) {
    console.log(error);
  }
}());

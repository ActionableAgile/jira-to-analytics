import config from './config';
import * as fs from 'fs';
import JiraExtractor from './jira-extractor';

const start = async function() {
  const start = new Date().getTime;

  const jiraExtractor = new JiraExtractor(config);
  await jiraExtractor.extractWorkItems();
  const csv = jiraExtractor.toCSV();

  try {
    await writeOutData('outputttt.csv', csv);
  } catch (error) {
    console.log('Error writing out CSV.');
    console.log('Dumping CSV below:');
  }
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

start();

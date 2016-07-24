import * as fs from 'fs';
import { JiraExtractor, JiraSettings } from './main';
import { safeLoad } from 'js-yaml';
import { argv } from 'yargs';
import * as ProgressBar from 'progress';

const defaultYamlPath = 'config.yaml';
const defaultOutputPath = 'output.csv';
const bar = new ProgressBar('  Extracting: [:bar] :percent | :eta seconds remaining', {
    complete: '=',
    incomplete: ' ',
    width: 20,
    total: 100,
});

const getArgs = () => {
  return argv;
};

const log = (data: any) => {
  console.log(data)
};

const writeFile = (filePath: string, data: any) =>
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
  // Parse CLI settings
  const jiraConfigPath: string = cliArgs.i ? cliArgs.i : defaultYamlPath;
  const isLegacyYaml: boolean = (cliArgs.l || cliArgs.legacy) ? true : false;
  const outputPath: string = cliArgs.o ? cliArgs.o : defaultOutputPath;
  const outputType: string = outputPath.split('.')[1].toUpperCase();
  if (outputType !== 'CSV' && outputType !== 'JSON') {
    throw new Error('Only CSV and JSON is currently supported for file output.');
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
  
  log('Beginning extraction process');

  // Progress bar setup
  const updateProgressHook = (bar => {
    bar.tick();
    return (percentDone = null) => {
      if (percentDone <= 100) 
        bar.tick(percentDone);
    } 
  })(bar);
  
  // Import data
  const jiraExtractor = new JiraExtractor(jiraSettings, updateProgressHook);
  try {
    const a = await jiraExtractor.testConnection(jiraSettings);
    console.log(a);

    const b = await jiraExtractor.getProjects(jiraSettings);
    // console.log(b);

    const c = await jiraExtractor.getWorkflows('UT', jiraSettings)
    // console.log(c);

    await jiraExtractor.getWorkItems();

  } catch (e) {
    console.log(`Error extracting JIRA Items ${e}`);
    throw e;
  }

  // Export data
  let data: string;
  if (outputType === 'CSV') {
    data = jiraExtractor.toCSV();
  } else if (outputType === 'JSON') {
    data = jiraExtractor.toSerializedArray();
  }
  try {
    await writeFile(outputPath, data);
  } catch (e) {
    console.log(`Error writing jira data to ${outputPath}`);
  }

  const end = new Date().getTime();
  log(`Done. Results written to ${outputPath}`);
  
  return;
};

(async function(args: any): Promise<void> {
  try {
    await run(args);
  } catch (e) {
    console.log(`Error running ActionableAgile Command Line Tool`)
    console.log(e);
  }
}(getArgs()));


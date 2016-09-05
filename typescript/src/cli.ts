import * as fs from 'fs';
import { JiraExtractor, LeanKitExtractor } from './main';
import { safeLoad, safeDump } from 'js-yaml';
import { argv } from 'yargs';
import * as ProgressBar from 'progress';
import { setup } from './lib/cli/leankit-cli';

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

  if (cliArgs.leankit) {

    if (cliArgs.setup) {
      console.log('Welcome to the LeanKit Extraction Tool Setup');
      const settingsObject = await setup();
      try {
        const output = safeDump(settingsObject);
        await writeFile(defaultYamlPath, output);
        console.log(`LeanKit Extraction Tool Setup is complete.`);
        console.log(`Saved configuration to ${defaultYamlPath}`)
        console.log('Please rerun the tool without the setup flag to extract');
        return;
      } catch (e) {
        log(`Error writing leankit config data to ${defaultYamlPath}`);
      }
    }
    const leankitConfigPath: string = cliArgs.i ? cliArgs.i : defaultYamlPath;
    const outputPath: string = cliArgs.o ? cliArgs.o : defaultOutputPath;
    const outputType: string = outputPath.split('.')[1].toUpperCase();
    if (outputType !== 'CSV') {
      throw new Error('Only CSV is supported for file output for the LeanKit beta');
    }
    // Parse YAML settings
    let settings: any  = {};
    try {
      const yamlConfig = safeLoad(fs.readFileSync(leankitConfigPath, 'utf8'));
      settings = yamlConfig;
    } catch (e) {
      console.log(`Error parsing settings ${e}`);
      throw e;
    }
    log('Beginning extraction process');

    const leankitExtractor = new LeanKitExtractor(settings);
    const output: string = await leankitExtractor.driver();
    try {
      await writeFile(outputPath, output);
    } catch (e) {
      log(`Error writing jira data to ${outputPath}`);
    }
    log(`Done. Results written to ${outputPath}`);
    return;
  }


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
  
  log('Beginning extraction process');

  // Progress bar setup
  const updateProgressHook = (bar => {
    bar.tick();
    return (percentDone: number) => {
      if (percentDone <= 100) 
        bar.tick(percentDone);
    } 
  })(bar);
  
  // Import data
  const jiraExtractor = new JiraExtractor()
    .importSettings(settings, 'yaml')
    .setBatchSize(25)

  try {
    const workItems = await jiraExtractor.extractAll(updateProgressHook);

    // Export data
    let data: string;
    if (outputType === 'CSV') {
      data = await jiraExtractor.toCSV(workItems);
    } else if (outputType === 'JSON') {
      data = jiraExtractor.toSerializedArray(workItems);
    }
    try {
      await writeFile(outputPath, data);
    } catch (e) {
      log(`Error writing jira data to ${outputPath}`);
    }

    const end = new Date().getTime();
    log(`Done. Results written to ${outputPath}`);
    
    return;
  } catch (e) {
    log(`Error extracting JIRA Items ${e}`);
    throw e;
  }
};

(async function(args: any): Promise<void> {
  try {
    await run(args);
  } catch (e) {
    log(`Error running ActionableAgile Command Line Tool`);
    log(e);
  }
}(getArgs()));


import * as fs from 'fs';
import { safeLoad, safeDump } from 'js-yaml';
import { argv } from 'yargs';
import * as ProgressBar from 'progress';
import { setup } from './lib/cli/leankit-cli';
import { getPassword } from './lib/cli/jira-cli';
import { JiraExtractor, LeanKitExtractor, TrelloExtractor } from './main';

const defaultYamlPath = 'config.yaml';
const defaultOutputPath = 'output.csv';

const bar = new ProgressBar('  Extracting: [:bar] :percent | :eta seconds remaining', {
    complete: '=',
    incomplete: ' ',
    width: 20,
    total: 100,
});

const getArgs = () => argv;
const log = (main?: any, ...additionalParams: any[]) => {
  console.log(main, ...additionalParams);
};

const writeFile = (filePath: string, data: any) =>
  new Promise((accept, reject) => {
    fs.writeFile(filePath, data, (err => {
      if (err) {
        log(`Error writing file to ${filePath}`);
        return reject(err);
      }
      accept();
    }));
  });

const run = async function(cliArgs: any): Promise<void> {
  log('ActionableAgile Extraction Tool Starting...');

  if (cliArgs.trello) {
    const trelloConfigPath: string = cliArgs.i ? cliArgs.i : defaultYamlPath;
    const outputPath: string = cliArgs.o ? cliArgs.o : defaultOutputPath;
    const outputType: string = outputPath.split('.')[1].toUpperCase();
    if (outputType !== 'CSV') {
      throw new Error('Only CSV is supported for file output for the Trello beta');
    }
    // Parse YAML settings
    let settings: any  = {};
    try {
      const yamlConfig = safeLoad(fs.readFileSync(trelloConfigPath, 'utf8'));
      settings = yamlConfig;
    } catch (e) {
      log(`Error parsing settings ${e}`);
      throw e;
    }
    log('Beginning extraction process');

    if (settings.Key === null || settings.Key === undefined) {
      throw new Error('Trello key not set!');
    }

    if (settings.Token === null || settings.Token === undefined) {
      throw new Error('Trello token not set!');
    }

    if (settings.BoardId === null || settings.BoardId === undefined) {
      throw new Error('Trello BoardId not set!');
    }

    const trelloExtractor = new TrelloExtractor({
      workflow: settings.Workflow,
      key: settings.Key,
      token: settings.Token,
    });
    const output: string = await trelloExtractor.extractToCSV(settings.BoardId);
    try {
      await writeFile(outputPath, output);
    } catch (e) {
      log(`Error writing trello data to ${outputPath}`);
    }
    log(`Done. Results written to ${outputPath}`);
    return;
  }

  if (cliArgs.leankit) {

    if (cliArgs.setup) {
      log('Welcome to the LeanKit Extraction Tool Setup');
      const settingsObject = await setup();
      try {
        const output = safeDump(settingsObject);
        await writeFile(defaultYamlPath, output);
        log(`LeanKit Extraction Tool Setup is complete.`);
        log(`Saved configuration to ${defaultYamlPath}`);
        log('Please rerun the tool without the setup flag to extract');
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
      log(`Error parsing settings ${e}`);
      throw e;
    }
    log('Beginning extraction process');

    const leankitExtractor = new LeanKitExtractor(settings);
    const output: string = await leankitExtractor.driver();
    try {
      await writeFile(outputPath, output);
    } catch (e) {
      log(`Error writing leankit data to ${outputPath}`);
    }
    log(`Done. Results written to ${outputPath}`);
    return;
  }

  log('JIRA Extractor configuring...');
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
    log(`Error parsing settings ${e}`);
    throw e;
  }

  log('');
  if (!settings.Connection.Password && !settings.Connection.Token) {
    const password = await getPassword();
    settings.Connection.Password = password;
  }

  log('');

  if (settings['Feature Flags']) {
    log('Feature Flags detected:');
    for (let featureName in settings['Feature Flags']) {
      log(`  ${featureName}: ${settings['Feature Flags'][featureName] ? 'on' : 'off'}`);
    }
    log('');
  }

  log('Beginning extraction process');
  // Progress bar setup
  const updateProgressHook = (bar => {
    bar.tick();
    return (percentDone: number) => {
      if (percentDone <= 100) {
        bar.tick(percentDone);
      }
    };
  })(bar);

  // Import data
  const jiraExtractor = new JiraExtractor()
    .importSettingsFromYaml(settings)
    .setBatchSize(25);

  try {
    const workItems = await jiraExtractor.extractAll(updateProgressHook);

    // Export data
    let data: string = '';
    if (outputType === 'CSV') {
      data = await jiraExtractor.toCSV(workItems);
    } else if (outputType === 'JSON') {
      console.error('JSON not currently supported');
    //   data = jiraExtractor.toSerializedArray(workItems);
    }
    try {
      await writeFile(outputPath, data);
    } catch (e) {
      log(`Error writing jira data to ${outputPath}`);
    }
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

import * as fs from 'fs';
import * as ProgressBar from 'progress';
import { safeLoad } from 'js-yaml';
import { argv } from 'yargs';
import { prompt } from 'inquirer';
import { JiraExtractor } from './main';
import { convertYamlToJiraSettings } from './lib/components/yaml-converter';

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

const run = async function (cliArgs: any): Promise<void> {
  log('ActionableAgile Extraction Tool Starting...');
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
  let settings: any = {};
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
  const jiraExtractorConfig = convertYamlToJiraSettings(settings);
  const jiraExtractor = new JiraExtractor(jiraExtractorConfig);

  await jiraExtractor.testConnection();

  try {
    const workItems = await jiraExtractor.extractAll(updateProgressHook);

    // Export data
    let data: string = '';
    if (outputType === 'CSV') {
      data = await jiraExtractor.toCSV(workItems);
    } else if (outputType === 'JSON') {
      console.error('JSON not currently supported');
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

const getPassword = async (): Promise<string> => {
  const passwordQuestion = {
    message: 'Enter your JIRA password: ',
    type: 'password',
    name: 'password'
  };
  const answers = await prompt(passwordQuestion);
  const password: string = answers['password'];
  return password;
};

(async function (args: any): Promise<void> {
  try {
    await run(args);
  } catch (e) {
    log(`Error running ActionableAgile Command Line Tool`);
    log(e);
  }
} (getArgs()));




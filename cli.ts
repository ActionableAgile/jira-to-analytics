import * as fs from 'fs';
import * as ProgressBar from 'progress';
import * as chalk from 'chalk';
import { safeLoad } from 'js-yaml';
import { argv } from 'yargs';
import { prompt } from 'inquirer';
import { JiraExtractor } from './index';
import { convertYamlToJiraSettings } from './src/components/yaml-converter';

const defaultYamlPath = 'config.yaml';
const defaultOutputPath = 'output.csv';

const bar = new ProgressBar(chalk.cyan('  Extracting: [:bar] :percent | :eta seconds remaining'), {
  complete: '=',
  incomplete: ' ',
  width: 20,
  total: 100,
});

const getArgs = () => argv;

const clearConsole = () => process.stdout.write('\x1Bc');

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

const run = async function (cliArgs: any): Promise<void> {
  clearConsole();
  console.log(chalk.underline('ActionableAgile Extraction Tool'));
  console.log('JIRA Extractor configuring...');
  // Parse CLI settings
  const jiraConfigPath: string = cliArgs.i ? cliArgs.i : defaultYamlPath;
  const isLegacyYaml: boolean = (cliArgs.l || cliArgs.legacy) ? true : false;
  const debugMode: boolean = cliArgs.d ? true : false;
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
    console.log(`Error parsing settings ${e}`);
    throw e;
  }

  console.log('');
  if (debugMode) {
    console.log(`Debug mode: ${chalk.green('ON') }`);
  }

  if (settings['Feature Flags']) {
    console.log('Feature Flags detected:');
    for (let featureName in settings['Feature Flags']) {
      console.log(`  ${featureName}: ${settings['Feature Flags'][featureName] ? chalk.green('ON') : chalk.red('OFF')}`);
    }
    console.log('');
  }

  if (!settings.Connection.Password && !settings.Connection.Token) {
    const password = await getPassword();
    settings.Connection.Password = password;
    console.log('');
  }

  // Import data
  const jiraExtractorConfig = convertYamlToJiraSettings(settings);
  const jiraExtractor = new JiraExtractor(jiraExtractorConfig);

  console.log('Authenticating...');
  const isAuthenticated = await jiraExtractor.testConnection();
  if (!isAuthenticated) {
    throw new Error('Unable to authenticate. Please check your provided credentials.');
  }
  console.log(chalk.green('Authentication successful.\n'));

  console.log('Beginning extraction process');
  // Progress bar setup
  const updateProgressHook = (bar => {
    bar.tick();
    return (percentDone: number) => {
      if (percentDone <= 100) {
        bar.tick(percentDone);
      }
    };
  })(bar);

  try {
    const workItems = await jiraExtractor.extractAll(updateProgressHook, debugMode);
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
      console.log(`Error writing jira data to ${outputPath}`);
    }
    console.log(chalk.green('Successful.'));
    console.log(`Results written to ${outputPath}`);
    return;
  } catch (e) {
    throw e;
  }
};

(async function (args: any): Promise<void> {
  try {
    await run(args);
  } catch (e) {
    console.log('');
    console.log(chalk.red(`Error running ActionableAgile command line tool. Please see error below.`));
    console.log(chalk.red(e));
  }
} (getArgs()));




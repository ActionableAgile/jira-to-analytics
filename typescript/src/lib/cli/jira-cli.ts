import * as inquirer from 'inquirer';

const questions: any[]= [
  {
    message: 'Enter your JIRA password: ',
    type: 'password',
    name: 'password'
  },
];

const getPassword = async (): Promise<string> => {
  const answers = await inquirer.prompt(questions);
  const password: string = answers['password'];
  return password;
};

export {
  getPassword,
};
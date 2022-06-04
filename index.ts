import { Octokit } from '@octokit/core';
import chalk from 'chalk';
import figlet from 'figlet';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import * as os from 'os';

type run = {
  UserName: string;
  LastRunTimeStamp: string;
};
const defaultUser = 'takakabe';
const timeNow = new Date(Date.now()).toISOString();

const options = yargs(hideBin(process.argv))
  .usage('Usage: node index.js [-u, --user [username]] [-f, --freshrun]')
  .options('user', {
    alias: 'u',
    describe: "The GitHub handle of user who's gists you'd like to list",
    type: 'string',
    default: defaultUser,
    demandOption: false,
  })
  .option('freshrun', {
    alias: 'f',
    describe:
      "List all of the user's gists even if listed during a previous run",
    type: 'boolean',
    default: false,
    demandOption: false,
  })
  .help()
  .parseSync();

let filePath: fs.PathLike;

switch (os.platform()) {
  case 'win32':
    filePath = `${process.env.APPDATA}\\lastRUN`;
    break;
  default:
    filePath = `${process.env.HOME}/lastRUN`;
}

const client = new Octokit({});

const getGists = async (user: string, time?: string) => {
  await client
    .request('GET /users/{username}/gists', {
      username: user,
      since: time,
    })
    .then((result) => {
      console.log(
        chalk.cyan(
          figlet.textSync(user, {
            horizontalLayout: 'default',
            font: 'Colossal',
          })
        )
      );
      result.data.forEach((gist) =>
        console.log(
          chalk.magentaBright('Created: ') +
            new Date(gist.created_at).toDateString() +
            chalk.cyan(','),
          chalk.green('URL: ') + gist.html_url + chalk.cyan(','),
          chalk.yellow('Description: ') + gist.description
        )
      );
      return;
    })
    .catch((error) => console.log(error));
};

const runFileExists = (file: fs.PathLike) => {
  return fs.existsSync(file);
};

const loadRunFile = (file: fs.PathLike): run[] => {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
};

const updateRunEntry = (time: string, entries: run[], matchIndex: number) => {
  entries[matchIndex] = { ...entries[matchIndex], LastRunTimeStamp: time };
  return entries;
};

const newEntry = (user: string, time: string, entries: run[]) => {
  const rawEntry: run = {
    UserName: user,
    LastRunTimeStamp: time,
  };
  entries.push(rawEntry);
  return entries;
};

const saveChanges = (file: fs.PathLike, fileContents: run[]) => {
  const json = JSON.stringify(fileContents);
  fs.appendFile(file, json, { flag: 'w+', encoding: 'utf8' }, (error) => {
    if (error) {
      console.log(error);
      return;
    }
  });
};

const initialRun = (file: fs.PathLike, user: string, time: string) => {
  const entries: run[] = [];
  const rawEntry: run = {
    UserName: user,
    LastRunTimeStamp: time,
  };
  entries.push(rawEntry);
  const content = entries;
  saveChanges(file, content);
  getGists(user).then();
};

const consecutiveRun = (file: fs.PathLike, user: string, time: string) => {
  const runData = loadRunFile(file);
  const matchIndex = runData.findIndex((runEntry) => runEntry.UserName == user);
  if (matchIndex > -1) {
    const updatedContent = updateRunEntry(time, runData, matchIndex);
    saveChanges(file, updatedContent);
    options.freshrun ? getGists(user).then() : getGists(user, time).then();
  } else {
    const newContent = newEntry(user, time, runData);
    saveChanges(file, newContent);
    getGists(user).then();
  }
};

// Check if run file exists

if (runFileExists(filePath)) {
  consecutiveRun(filePath, options.user, timeNow);
} else {
  initialRun(filePath, options.user, timeNow);
}

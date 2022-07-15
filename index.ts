import { Octokit } from '@octokit/core';
import { paginateRest } from '@octokit/plugin-paginate-rest';
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods';
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
const defaultUser = 'djsd123';
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

/*
  Load plugins into Ocktokit for pagination and helper methods.
  https://github.com/octokit/plugin-paginate-rest.js
  https://github.com/octokit/plugin-rest-endpoint-methods.js/blob/master/docs/gists/listForUser.md
*/
const OcktokitWithPagination = Octokit.plugin(
  paginateRest,
  restEndpointMethods
);
const client = new OcktokitWithPagination({});
const listForUserMethod = client.rest.gists.listForUser;

let printName = (user: string) => {
  console.log(
    chalk.cyan(
      figlet.textSync(user, {
        horizontalLayout: 'default',
        font: 'Colossal',
      })
    )
  );
  /*
    Pagination result indices always reset to 0 for each page of results/gists.
    I only want to call this **printName** function ONCE at the top of the first page and want to do it
    only once I have retrieved the first page of results successfully.

    This is why below I am assigning the **printName** function to a noop function, so on subsequent calls
    to the **printName** function. Nothing happens. See: https://stackoverflow.com/a/72992927/2719085
  */
  printName = () => {
    // NooP
  };
};

/*
  gist: Type auto generated
*/
const printGist = (gist: {
  url?: string;
  forks_url?: string;
  commits_url?: string;
  id?: string;
  node_id?: string;
  git_pull_url?: string;
  git_push_url?: string;
  html_url: any;
  files?: {
    [key: string]: {
      filename?: string | undefined;
      type?: string | undefined;
      language?: string | undefined;
      raw_url?: string | undefined;
      size?: number | undefined;
    };
  };
  public?: boolean;
  created_at: any;
  updated_at?: string;
  description: any;
  comments?: number;
  user?: {
    name?: string | null | undefined;
    email?: string | null | undefined;
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string | null;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
    starred_at?: string | undefined;
  } | null;
  comments_url?: string;
  owner?:
    | {
        name?: string | null | undefined;
        email?: string | null | undefined;
        login: string;
        id: number;
        node_id: string;
        avatar_url: string;
        gravatar_id: string | null;
        url: string;
        html_url: string;
        followers_url: string;
        following_url: string;
        gists_url: string;
        starred_url: string;
        subscriptions_url: string;
        organizations_url: string;
        repos_url: string;
        events_url: string;
        received_events_url: string;
        type: string;
        site_admin: boolean;
        starred_at?: string | undefined;
      }
    | undefined;
  truncated?: boolean | undefined;
  forks?: unknown[] | undefined;
  history?: unknown[] | undefined;
}) => {
  console.log(
    chalk.magentaBright('Created: ') +
      new Date(gist.created_at).toDateString() +
      chalk.cyan(','),
    chalk.green('URL: ') + gist.html_url + chalk.cyan(','),
    chalk.yellow('Description: ') + gist.description
  );
};

const getGists = async (user: string, time?: string) => {
  for await (const results of client.paginate.iterator(listForUserMethod, {
    username: user,
    since: time,
  })) {
    results.data.forEach((gist, index) => {
      index == 0 ? (printName(user), printGist(gist)) : printGist(gist);
    });
  }
};

/*
  I use a JSON formatted file to store timestamps of previous runs for each user queried
*/
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

/*
  The data in the file is always overwritten with in memory data
*/
const saveChanges = (file: fs.PathLike, fileContents: run[]) => {
  const json = JSON.stringify(fileContents);
  fs.appendFile(file, json, { flag: 'w+', encoding: 'utf8' }, (error) => {
    if (error) {
      console.log(error);
      return;
    }
  });
};

/*
  This function is called when this utility doesn't find an existing run file
*/
const initialRun = (file: fs.PathLike, user: string, time: string) => {
  const entries: run[] = [];
  const rawEntry: run = {
    UserName: user,
    LastRunTimeStamp: time,
  };
  entries.push(rawEntry);
  saveChanges(file, entries);
  getGists(user).then();
};

/*
  This function is called when this utility finds an existing run file
*/
const consecutiveRun = (file: fs.PathLike, user: string, time: string) => {
  const runData = loadRunFile(file);
  const matchIndex = runData.findIndex((runEntry) => runEntry.UserName == user);
  /*
    (matchIndex > -1) means if we find the user we're querying in the run file
  */
  if (matchIndex > -1) {
    const updatedContent = updateRunEntry(time, runData, matchIndex);
    saveChanges(file, updatedContent);
    /*
      options.freshrun or -f (on the command line)
      Means this utility will ignore the fact that there is a timestamp by
      calling the **getGists** function without the optional timestamp parameter.
    */
    options.freshrun ? getGists(user).then() : getGists(user, time).then();
  } else {
    /*
      if we don't find the user we're querying in the run file, then we
      proceed with the below.
      i.e. add the user and timestamp to the run file, then fetch their gists
    */
    const newContent = newEntry(user, time, runData);
    saveChanges(file, newContent);
    getGists(user).then();
  }
};

/*
  If this utility doesn't find a run file, then we call the **initialRun** function.
  Otherwise, we call the **consecutiveRun** function upon finding an existing run file.
*/

runFileExists(filePath)
  ? consecutiveRun(filePath, options.user, timeNow)
  : initialRun(filePath, options.user, timeNow);

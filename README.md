# equal-experts
A small command line utility to list a user's public gists

[node]: https://nodejs.org/en/download/package-manager/

Lists a user's public gists.  On subsequent runs will only list a previously queried user's gists that have been published 
since the last time that user was queried :confused:

## Requirements

| Name     | Version            |
|----------|--------------------|
| [node]   | > = 14.x, < 15.x   |


## Setup

Once you've installed [node]. Open a shell/terminal at the root of this project, then:
* `npm install`
* `npm run build` **Optional** but recommended

**note**

Once you have run `npm install` there should be a tool added to your path called `ts-node-esm`. Which will allow you to exec the typescript directly by passing the [index.ts](index.ts)
file directly to `ts-node-esm`.  For example `ts-node-esm index.ts .....`.

Alternatively, you can run `npm run build` which will transpile the typescript to javascript allowing you use the [node] runtime
executable. i.e. `node index.js ....`

I tried to create a static binary and unfortunately failed :disappointed:. See github [issue](https://github.com/vercel/pkg/issues/1291)

## Usage

__Print Help__


`npm run help`
or
`node index.js --help`



__List a user's gists__


`node index.js -u <USERNAME>`

__List all gists for a previously queried user__


`node index.js -u <USERNAME> -f`


## Options

| Flag             | Description                                                         | Required |
|------------------|---------------------------------------------------------------------|----------|
| `-u, --user`     | `The GitHub handle of user who's gists you'd like to list`          | `false`  |
| `-f, --freshrun` | `List all of the user's gists even if listed during a previous run` | `false`  |
| `--version`      | `Show version number`                                               | `false`  |
| `--help`         | `Show help`                                                         | `false`  |

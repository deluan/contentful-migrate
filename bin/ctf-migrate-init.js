#!/usr/bin/env node
// vim: set ft=javascript:


const program = require('commander');
const chalk = require('chalk');

const Store = require('../lib/store');
const pkg = require('../package.json');

program
  .version(pkg.version)
  .description('Prepares the specified space to allow managed migration scripts')
  .option('-t, --access-token [access-token]', 'CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty')
  .option('-s, --space-id [space-id]', 'space id to use')
  .parse(process.argv);

/* eslint-disable no-console */
const { spaceId } = program;
const accessToken = program.accessToken || process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
const dryrun = 'false';

if (!spaceId || !accessToken) {
  if (!spaceId) console.log(chalk.bold.red('🚨 space id is required'));
  if (!accessToken) console.log(chalk.bold.red('🚨 access token not found'));
  process.exit(1);
}

const store = new Store({ spaceId, accessToken, dryrun });
store.init();

#!/usr/bin/env node
// vim: set ft=javascript:


const program = require('commander');
const path = require('path');
const chalk = require('chalk');
const runMigrations = require('migrate/lib/migrate');
const log = require('migrate/lib/log');
const pkg = require('../package.json');
const load = require('../lib/load');


program
  .version(pkg.version)
  .usage('[options] [name]')
  .description('Migrate up to a specific version')
  .option('-t, --access-token [access-token]', 'CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty')
  .option('-c, --content-type [content-type]', 'content type name')
  .option('-s, --space-id [space-id]', 'space id to use')
  .option('-d, --dry-run', 'only shows the plan, don\'t write anything to contentful. defaults to false')
  .parse(process.argv);

const { spaceId, contentType } = program;
const accessToken = program.accessToken || process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
const dryrun = typeof program.dryRun !== 'undefined';

if (!spaceId || !contentType || !accessToken) {
  if (!contentType) log(chalk.bold.red('🚨 content-type is required'));
  if (!spaceId) log(chalk.bold.red('🚨 space-id is required'));
  if (!accessToken) log(chalk.bold.red('🚨 access-token is required'));
  process.exit(1);
}

const migrationsDirectory = path.join('.', 'migrations', contentType);

// Load in migrations
function loadAndGo() {
  load({
    migrationsDirectory, spaceId, accessToken, dryrun, contentTypes: [contentType]
  })
    .then((set) => {
      runMigrations(set, 'up', program.args[0], (error) => {
        if (error) {
          log('error', error);
          process.exit(1);
        }

        log('migration', 'complete');
        process.exit(0);
      });
    })
    .catch((err) => {
      log.error('error', err);
      process.exit(1);
    });
}

loadAndGo();

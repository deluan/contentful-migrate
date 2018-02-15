#!/usr/bin/env node
// vim: set ft=javascript:

const program = require('commander');
const path = require('path');
const chalk = require('chalk');
const dateFormat = require('dateformat');
const log = require('migrate/lib/log');
const pkg = require('../package.json');
const load = require('../lib/load');

program
  .version(pkg.version)
  .description('List all migrations for a given content-type, also indicating whether it was already applied and when')
  .option('-t, --access-token [access-token]', 'CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty')
  .option('-c, --content-type [content-type]', 'content type name')
  .option('-s, --space-id [space-id]', 'space id to use')
  .parse(process.argv);

const { spaceId, contentType } = program;
const accessToken = program.accessToken || process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
const dryrun = 'false';

if (!spaceId || !contentType || !accessToken) {
  if (!contentType) log(chalk.bold.red('🚨 content-type is required'));
  if (!spaceId) log(chalk.bold.red('🚨 space-id is required'));
  if (!accessToken) log(chalk.bold.red('🚨 access-token is required'));
  process.exit(1);
}

const migrationsDirectory = path.join('.', 'migrations', contentType);

// Load in migrations
load({
  migrationsDirectory, spaceId, accessToken, dryrun, contentTypes: [contentType]
})
  .then((set) => {
    if (set.migrations.length === 0) {
      log('list', 'No Migrations');
    }

    set.migrations.forEach((migration) => {
      log((migration.timestamp ? `[${dateFormat(migration.timestamp, 'yyyy-mm-dd HH:mm:ss')}] ` : '[pending] ') +
        migration.title, migration.description || '<No Description>');
    });
  })
  .catch((err) => {
    log.error('error', err);
    process.exit(1);
  });

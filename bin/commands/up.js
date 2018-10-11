#!/usr/bin/env node
// vim: set ft=javascript:
/* eslint-disable no-console */

const path = require('path');
const { promisify } = require('util');
const chalk = require('chalk');
const pMap = require('p-map');
const runMigrations = require('migrate/lib/migrate');
const log = require('migrate/lib/log');
const load = require('../../lib/load');

exports.command = 'up [file]';

exports.desc =
  'Migrate up to a give migration or all pending if not specified';

exports.builder = (yargs) => {
  yargs
    .option('access-token', {
      alias: 't',
      describe:
        'Contentful Management API access token',
      demandOption: true,
      default: process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN,
      defaultDescription: 'environment var CONTENTFUL_MANAGEMENT_ACCESS_TOKEN'
    })
    .option('space-id', {
      alias: 's',
      describe: 'space id to use',
      type: 'string',
      requiresArg: true,
      demandOption: true
    })
    .option('environment-id', {
      alias: 'e',
      describe: 'id of the environment within the space',
      type: 'string',
      requiresArg: true,
      default: 'master'
    })
    .option('dry-run', {
      alias: 'd',
      describe: 'only shows the planned actions, don\'t write anything to Contentful',
      boolean: true,
      default: false
    })
    .positional('file', {
      describe: 'If specified, applies all pending migrations scripts up to this one.',
      type: 'string'
    });
};

const runMigrationsAsync = promisify(runMigrations);

exports.handler = async (args) => {
  const {
    accessToken,
    dryRun,
    environmentId,
    file,
    spaceId
  } = args;

  const migrationsDirectory = path.join('.', 'migrations');

  const processSet = set => runMigrationsAsync(set, 'up', file);

  // Load in migrations
  const sets = await load({
    accessToken,
    dryRun,
    environmentId,
    migrationsDirectory,
    spaceId
  });

  // TODO concurrency can be an cmdline option? I set it to 1 for now to make logs more readable
  pMap(sets, processSet, { concurrency: 1 })
    .then(() => {
      console.log(chalk.bold.yellow(`\n🎉  All migrations are applied to ${environmentId} environment`));
    })
    .catch((err) => {
      log.error('error', err);
      console.log(chalk.bold.red(`\n🚨  Error applying migrations to "${environmentId}" environment! See above for error messages`));
      process.exit(1);
    });
};

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
      demandOption: true
    })
    .option('content-type', {
      alias: 'c',
      describe: 'one or more content type names to process',
      array: true,
      default: []
    })
    .option('all', {
      alias: 'a',
      describe: 'processes migrations for all content types',
      boolean: true
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
    })
    .check((argv) => {
      if (argv.a && argv.c.length > 0) {
        return 'Arguments \'content-type\' and \'all\' are mutually exclusive';
      }
      if (!argv.a && argv.c.length === 0) {
        return 'At least one of \'all\' or \'content-type\' options must be specified';
      }
      if (argv.a && argv.file) {
        return '[file] cannot be specified together with \'all\' option';
      }
      return true;
    });
};

const runMigrationsAsync = promisify(runMigrations);

exports.handler = async ({
  spaceId, contentType, dryRun, file, accessToken
}) => {
  const migrationsDirectory = path.join('.', 'migrations');

  const processSet = async (set) => {
    console.log(chalk.bold.blue('Processing'), set.store.contentTypeID);
    await runMigrationsAsync(set, 'up', file);
    log('All migrations applied for', `${set.store.contentTypeID}`);
  };

  // Load in migrations
  const sets = await load({
    migrationsDirectory, spaceId, accessToken, dryRun, contentTypes: contentType
  });

  // TODO concurrency can be an cmdline option? I set it to 1 for now to make logs more readable
  pMap(sets, processSet, { concurrency: 1 })
    .then(() => {
      console.log(chalk.bold.yellow('\n🎉  All content types are up-to-date'));
    })
    .catch((err) => {
      log.error('error', err);
      console.log(chalk.bold.red('\n🚨  Error applying migrations! See above for error message '));
    });
};

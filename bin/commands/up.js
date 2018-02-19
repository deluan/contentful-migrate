#!/usr/bin/env node
// vim: set ft=javascript:

const path = require('path');
const chalk = require('chalk');
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
        'CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty',
      demandOption: true,
      default: process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN
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
      requiresArg: true
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
      if (argv.a && argv.c) {
        return 'Arguments \'content-type\' and \'all\' are mutually exclusive';
      }
      if (!argv.a && !argv.c) {
        return 'At least one of \'all\' or \'content-type\' options must be specified';
      }
      if (argv.a && argv.file) {
        return '[file] cannot be specified together with \'all\' option';
      }
      return true;
    });
};

exports.handler = async (argv) => {
  const {
    spaceId, contentType, dryrun, file, accessToken
  } = argv;
  const migrationsDirectory = path.join('.', 'migrations');

  const processSet = (set) => {
    // eslint-disable-next-line no-console
    console.log(chalk.bold.blue('Processing'), set.store.contentTypeID);
    runMigrations(set, 'up', file, (error) => {
      if (error) {
        log('error', error);
        process.exit(1);
      }

      log('All migrations applied for', set.store.contentTypeID);
    });
  };

  // Load in migrations
  const sets = await load({
    migrationsDirectory, spaceId, accessToken, dryrun, contentTypes: contentType
  });

  sets.forEach(set => set
    .then(processSet)
    .catch((err) => {
      log.error('error', err);
      process.exit(1);
    }));
};

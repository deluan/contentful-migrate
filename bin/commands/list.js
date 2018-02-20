#!/usr/bin/env node
// vim: set ft=javascript:

const path = require('path');
const chalk = require('chalk');
const dateFormat = require('dateformat');
const log = require('migrate/lib/log');
const load = require('../../lib/load');

exports.command = 'list';

exports.desc =
  'List all migrations for a given content-type, also indicating whether it was already applied and when';

exports.builder = (yargs) => {
  yargs
    .options('access-token', {
      alias: 't',
      describe:
        'Contentful Management API access token',
      demandOption: true,
      default: process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN,
      defaultDescription: 'environment var CONTENTFUL_MANAGEMENT_ACCESS_TOKEN'
    })
    .option('space-id', {
      alias: 's',
      describe: 'space id to use'
      // demandOption: true
    })
    .option('content-type', {
      alias: 'c',
      describe: 'one or more content type names to list',
      array: true,
      default: []
    })
    .option('all', {
      alias: 'a',
      describe: 'lists migrations for all content types',
      boolean: true
    })
    .check((argv) => {
      if (argv.a && argv.c.length > 0) {
        return 'Arguments \'content-type\' and \'all\' are mutually exclusive';
      }
      if (!argv.a && argv.c.length === 0) {
        return 'At least one of \'all\' or \'content-type\' options must be specified';
      }
      return true;
    });
};

exports.handler = async ({ spaceId, contentType, accessToken }) => {
  const migrationsDirectory = path.join('.', 'migrations');

  const listSet = (set) => {
    // eslint-disable-next-line no-console
    console.log(chalk.bold.blue('Listing'), set.store.contentTypeID);
    if (set.migrations.length === 0) {
      log('list', 'No Migrations');
    }

    set.migrations.forEach((migration) => {
      log(
        (migration.timestamp
          ? `[${dateFormat(migration.timestamp, 'yyyy-mm-dd HH:mm:ss')}] `
          : chalk.bold.yellow('[pending]             ')) + chalk.bold.white(migration.title),
        migration.description || '<No Description>'
      );
    });
  };

  // Load in migrations
  const sets = await load({
    migrationsDirectory, spaceId, accessToken, dryRun: false, contentTypes: contentType
  });

  sets.forEach(set => set
    .then(listSet)
    .catch((err) => {
      log.error('error', err);
      process.exit(1);
    }));
};


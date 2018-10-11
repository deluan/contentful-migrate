#!/usr/bin/env node
// vim: set ft=javascript:

const path = require('path');
const chalk = require('chalk');
const dateFormat = require('dateformat');
const log = require('migrate/lib/log');
const load = require('../../lib/load');
const { isConsolidated } = require('../../lib/config');

exports.command = 'list';

exports.desc =
  'List all migrations for a given content-type, also indicating whether it was already applied and when';

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
    });

  if (!isConsolidated()) {
    yargs
      .option('folder', {
        alias: 'f',
        describe: 'one or more migrations sub-folders to list',
        array: true,
        default: []
      })
      .option('all', {
        alias: 'a',
        describe: 'lists migrations for all sub-folders',
        boolean: true
      })
      .check((argv) => {
        if (argv.a && argv.folder.length > 0) {
          return 'Arguments \'folder\' and \'all\' are mutually exclusive';
        }
        if (!argv.a && argv.folder.length === 0) {
          return 'At least one of \'all\' or \'folder\' options must be specified';
        }
        return true;
      });
  }
};

exports.handler = async ({
  spaceId, environmentId, folder, all, accessToken
}) => {
  const migrationsDirectory = path.join('.', 'migrations');

  const listSet = (set) => {
    // eslint-disable-next-line no-console
    console.log(chalk.bold.blue('Listing'), set.store.entryId);
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
    accessToken,
    folders: all ? [] : folder,
    dryRun: false,
    environmentId,
    migrationsDirectory,
    spaceId
  });

  sets.forEach(set => set
    .then(listSet)
    .catch((err) => {
      log.error('error', err);
      process.exit(1);
    }));
};


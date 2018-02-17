#!/usr/bin/env node
// vim: set ft=javascript:

const path = require('path');
const runMigrations = require('migrate/lib/migrate');
const log = require('migrate/lib/log');
const load = require('../../lib/load');

exports.command = 'down [file]';

exports.desc =
  'Migrate down to a given migration or just the last one if not specified';

exports.builder = (yargs) => {
  yargs
    .option('access-token', {
      alias: 't',
      describe:
        'CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty',
      demandOption: !process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN
    })
    .option('content-type', {
      alias: 'c',
      describe: 'content type name',
      demandOption: true
    })
    .option('space-id', {
      alias: 's',
      describe: 'space id to use',
      demandOption: true
    })
    .option('dry-run', {
      alias: 'd',
      describe: 'only shows the plan, don\'t write anything to Contentful',
      default: false
    })
    .positional('file', {
      describe: 'If specified, rollback all migrations scripts down to this one.',
      type: 'string'
    });
};

exports.handler = (argv) => {
  const {
    spaceId, contentType, dryrun, file
  } = argv;
  const accessToken = argv.accessToken || process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
  const migrationsDirectory = path.join('.', 'migrations', contentType);

  // Load in migrations
  function loadAndGo() {
    load({
      migrationsDirectory, spaceId, accessToken, dryrun, contentTypes: [contentType]
    })
      .then((set) => {
        const name = (file) || set.lastRun;

        runMigrations(set, 'down', name, (error) => {
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
};

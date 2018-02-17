#!/usr/bin/env node
// vim: set ft=javascript:

const path = require('path');
const dateFormat = require('dateformat');
const log = require('migrate/lib/log');
const load = require('../../lib/load');

exports.command = 'list';

exports.desc =
  'List all migrations for a given content-type, also indicating whether it was already applied and when';

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
    });
};

exports.handler = (argv) => {
  const { spaceId, contentType } = argv;
  const accessToken = argv.accessToken || process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
  const migrationsDirectory = path.join('.', 'migrations', contentType);

  // Load in migrations
  load({
    migrationsDirectory,
    spaceId,
    accessToken,
    dryrun: false,
    contentTypes: [contentType]
  })
    .then((set) => {
      if (set.migrations.length === 0) {
        log('list', 'No Migrations');
      }

      set.migrations.forEach((migration) => {
        log(
          (migration.timestamp
            ? `[${dateFormat(migration.timestamp, 'yyyy-mm-dd HH:mm:ss')}] `
            : '[pending] ') + migration.title,
          migration.description || '<No Description>'
        );
      });
    })
    .catch((err) => {
      log.error('error', err);
      process.exit(1);
    });
};

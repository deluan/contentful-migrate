#!/usr/bin/env node
// vim: set ft=javascript:

const chalk = require('chalk');
const readline = require('readline');
const path = require('path');

const bootstrap = require('../../lib/bootstrap');

exports.command = 'bootstrap';

exports.desc =
  'Takes a snapshot of existing space and automatically generate migration scripts';

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
    .option('content-type', {
      alias: 'c',
      describe: 'one or more content type names to process',
      array: true,
      default: []
    })
    .option('all', {
      alias: 'a',
      describe: 'lists migrations for all content types',
      boolean: true
    })
    .option('danger-will-robinson-danger', {
      describe: 'delete all current migrations and create already-applied states for all content types in space'
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

exports.handler = (args) => {
  const {
    environmentId,
    spaceId,
    contentType,
    dangerWillRobinsonDanger,
    accessToken
  } = args;
  const migrationsDirectory = path.join('.', 'migrations');
  if (contentType.length > 0) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(chalk.bold.yellow(`⚠️   Do you want to generate initial migration state for ${contentType}? y/N: `), (answer) => {
      rl.close();
      if (answer === 'y' || answer === 'yes') {
        bootstrap(spaceId, environmentId, contentType, accessToken, migrationsDirectory, true);
      } else {
        bootstrap(spaceId, environmentId, contentType, accessToken, migrationsDirectory);
      }
    });
  } else if (dangerWillRobinsonDanger) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    /* eslint-disable no-console */
    console.log(chalk.bold.red('🚨  What you are about to do is destructive!'));
    console.log(chalk.bold.red('    It will delete all existing scripts in the migrations folder.'));
    console.log(chalk.bold.red(`    And mutate all migration state for every content type in space ${spaceId}`));
    rl.question(chalk.bold.yellow('⚠️   Are you sure you want to proceed? y/N: '), (answer) => {
      rl.close();
      if (!(answer === 'y' || answer === 'yes')) {
        console.log(chalk.bold.yellow('⚠️   Aborted Bootstrap'));
        process.exit(1);
      }
      console.log(chalk.bold.green('🤞  May the 🐴 be with you'));
      bootstrap(spaceId, environmentId, contentType, accessToken, migrationsDirectory, dangerWillRobinsonDanger);
    });
    /* eslint-enable no-console */
  } else {
    bootstrap(spaceId, environmentId, contentType, accessToken, migrationsDirectory);
  }
};

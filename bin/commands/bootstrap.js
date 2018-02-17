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
        'CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty',
      demandOption: !process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN
    })
    .option('space-id', {
      alias: 's',
      describe: 'space id to use',
      demandOption: true
    })
    .option('danger-will-robinson-danger', {
      describe: 'delete all current migrations and create already-applied states for all content types in space'
    });
};

exports.handler = (argv) => {
  const { spaceId, dangerWillRobinsonDanger } = argv;
  const accessToken = argv.accessToken || process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
  const migrationsDirectory = path.join('.', 'migrations');

  if (dangerWillRobinsonDanger) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    /* eslint-disable no-console */
    console.log(chalk.bold.red('🚨  What you are about to do is desctructive!'));
    console.log(chalk.bold.red('    It will delete all existing scripts in the migrations folder.'));
    console.log(chalk.bold.red(`    And mutate all migration state for every content type in space ${spaceId}`));
    rl.question(chalk.bold.yellow('⚠️   Are you sure you want to proceed? y/N: '), (answer) => {
      rl.close();
      if (!(answer === 'y' || answer === 'yes')) {
        console.log(chalk.bold.yellow('⚠️   Aborted Bootstrap'));
        process.exit(1);
      }
      console.log(chalk.bold.green('🤞  May the 🐴 be with you'));
      bootstrap(spaceId, accessToken, migrationsDirectory, dangerWillRobinsonDanger);
    });
    /* eslint-enable no-console */
  } else {
    bootstrap(spaceId, accessToken, migrationsDirectory);
  }
};


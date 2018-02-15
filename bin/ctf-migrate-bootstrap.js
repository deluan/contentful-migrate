#!/usr/bin/env node
// vim: set ft=javascript:

const program = require('commander');
const chalk = require('chalk');
const log = require('migrate/lib/log');
const readline = require('readline');
const path = require('path');

const pkg = require('../package.json');
const bootstrap = require('../lib/bootstrap');

program
  .version(pkg.version)
  .description('Create migration scripts from existing content types in space')
  .option('-t, --access-token [access-token]', 'CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty')
  .option('-s, --space-id [space-id]', 'space id to use')
  .option('--danger-will-robinson-danger', 'delete all current migrations and create already-applied states for all content types in space')
  .parse(process.argv);

const { spaceId, dangerWillRobinsonDanger } = program;
const accessToken = program.accessToken || process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;

if (!spaceId || !accessToken) {
  if (!spaceId) log(chalk.bold.red('🚨 space-id is required'));
  if (!accessToken) log(chalk.bold.red('🚨 access-token is required'));
  process.exit(1);
}

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

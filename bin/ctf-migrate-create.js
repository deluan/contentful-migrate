#!/usr/bin/env node
// vim: set ft=javascript:

const program = require('commander');
const path = require('path');
const chalk = require('chalk');
const log = require('migrate/lib/log');
const generator = require('migrate/lib/template-generator');

const pkg = require('../package.json');

program
  .version(pkg.version)
  .description('Creates an empty time stamped file in the content-type\'s migrations folder')
  .option('-c, --content-type <content-type>', 'content type name')
  .arguments('<name>')
  .parse(process.argv);

const { args, contentType } = program;
const name = args[0];

if (!name || !contentType) {
  if (!contentType) log(chalk.bold.red('🚨 content-type is required'));
  if (!name) log(chalk.bold.red('🚨 script name is required'));
  process.exit(1);
}

const migrationsDirectory = path.join('.', 'migrations', contentType);
const templateFile = path.join(__dirname, '..', 'lib', 'template.js');

generator(
  {
    name, templateFile, migrationsDirectory, dateFormat: 'UTC:yyyymmddHHMMss'
  },
  (error, filename) => {
    if (error) {
      log(chalk.bold.red(`🚨 Template generation error ${error.message}`));
      process.exit(1);
    }
    log('🎉 created', filename);
  }
);

#!/usr/bin/env node
// vim: set ft=javascript:

const path = require('path')
const chalk = require('chalk')
const log = require('migrate/lib/log')
const generator = require('migrate/lib/template-generator')

exports.command = 'create <name>'

exports.desc =
  'Creates an empty time stamped file in the content-type\'s migrations folder'

exports.builder = (yargs) => {
  yargs
    .option('content-type', {
      alias: 'c',
      describe: 'content type name',
      type: 'string',
      requiresArg: true,
      demandOption: true
    })
    .positional('name', {
      describe: 'descriptive name for the migration file',
      type: 'string'
    })
}

exports.handler = ({ name, contentType }) => {
  const migrationsDirectory = process.env.CONTENTFUL_MIGRATIONS_DIR
    ? path.join(process.env.CONTENTFUL_MIGRATIONS_DIR, contentType)
    : path.join('.', 'migrations', contentType)

  const templateFile = path.join(__dirname, '..', '..', 'lib', 'template.js')

  generator({
    name,
    templateFile,
    migrationsDirectory,
    dateFormat: 'UTC:yyyymmddHHMMss',
    extension: '.js'
  }, (error, filename) => {
    if (error) {
      log(chalk.bold.red(`🚨 Template generation error ${error.message}`))
      process.exit(1)
    }
    log('🎉 created', filename)
  })
}

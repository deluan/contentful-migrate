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
    .option('template-file', {
      alias: 't',
      describe: 'template file path',
      type: 'string',
      requiresArg: true,
      demandOption: false
    })
    .option('extension', {
      alias: 'e',
      describe: 'migration file extension',
      type: 'string',
      requiresArg: true,
      demandOption: false
    })
    .positional('name', {
      describe: 'descriptive name for the migration file',
      type: 'string'
    })
}

exports.handler = ({ name, contentType, templateFile, extension }) => {
  const migrationsDirectory = path.join('.', 'migrations', contentType)
  templateFile = !!templateFile
    ? path.isAbsolute(templateFile) 
      ? templateFile
      : path.join(process.cwd(), templateFile)
    : !!process.env.TEMPLATE_FILE && typeof process.env.TEMPLATE_FILE === 'string'
      ? path.isAbsolute(process.env.TEMPLATE_FILE) 
        ? process.env.TEMPLATE_FILE
        : path.join(process.cwd(), process.env.TEMPLATE_FILE)
      : path.join(__dirname, '..', '..', 'lib', 'template.js')
  extension = !!extension
    ? extension
    : !!process.env.MIGRATION_FILE_EXTENSION && typeof process.env.MIGRATION_FILE_EXTENSION === 'string'
      ? process.env.MIGRATION_FILE_EXTENSION
      : '.js'

  generator({
    name,
    templateFile,
    migrationsDirectory,
    dateFormat: 'UTC:yyyymmddHHMMss',
    extension: extension
  }, (error, filename) => {
    if (error) {
      log(chalk.bold.red(`🚨 Template generation error ${error.message}`))
      process.exit(1)
    }
    log('🎉 created', filename)
  })
}

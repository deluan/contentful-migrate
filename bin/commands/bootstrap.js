#!/usr/bin/env node
// vim: set ft=javascript:

const chalk = require('chalk')
const readline = require('readline')
const path = require('path')

const bootstrap = require('../../lib/bootstrap')

exports.command = 'bootstrap'

exports.desc =
  'Takes a snapshot of existing space and automatically generate migration scripts'

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
    .check((argv) => {
      if (argv.a && argv.c.length > 0) {
        return 'Arguments \'content-type\' and \'all\' are mutually exclusive'
      }
      if (!argv.a && argv.c.length === 0) {
        return 'At least one of \'all\' or \'content-type\' options must be specified'
      }
      return true
    })
}

const isYes = response => response === 'y' || response === 'yes'

exports.handler = async (args) => {
  const {
    environmentId,
    spaceId,
    contentType,
    accessToken
  } = args

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const asyncQuestion = (question) => {
    return new Promise((resolve) => {
      rl.question(question, (response) => {
        resolve(response)
      })
    })
  }

  const migrationsDirectory = path.join('.', 'migrations')
  let writeMigrationState = false
  if (contentType.length > 0) {
    const answer = await asyncQuestion(chalk.bold.yellow(`⚠️   Do you want to generate initial migration state for ${contentType}? y/N: `))
    writeMigrationState = isYes(answer)
  } else {
    const answer = await asyncQuestion(chalk.bold.yellow('⚠️   Do you want to generate initial migration state for ALL content types? y/N: '))
    if (isYes(answer)) {
      console.log(chalk.bold.red('🚨  What you are about to do is destructive!'))
      console.log(chalk.bold.red(`    It will mutate all migration state for every content type in space ${spaceId}`))
      const confirmation = await asyncQuestion(chalk.bold.yellow('⚠️   Are you sure you want to proceed? y/N: '))
      writeMigrationState = isYes(confirmation)
    }
  }
  rl.close()
  await bootstrap(spaceId, environmentId, contentType, accessToken, migrationsDirectory, writeMigrationState)
}

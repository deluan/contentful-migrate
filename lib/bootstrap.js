const chalk = require('chalk');
const log = require('migrate/lib/log');
const logError = require('migrate/lib/log').error;

const generateScripts = require('./bootstrap/generateScripts');
const deleteScripts = require('./bootstrap/deleteScripts');
const rewriteMigration = require('./bootstrap/rewriteMigration');

const bootstrap = (spaceId, environmentId, accessToken, migrationsDirectory, robinson) => {
  if (!robinson) {
    return generateScripts(spaceId, environmentId, accessToken, migrationsDirectory)
      .then(() => log(chalk.bold.green('🎉  Bootstrap'), chalk.bold.green('successful')))
      .catch(error => logError('🚨  Failed to generate scripts', error));
  }
  return deleteScripts(migrationsDirectory)
    .then(() => generateScripts(spaceId, environmentId, accessToken, migrationsDirectory))
    .then(files => rewriteMigration(spaceId, environmentId, accessToken, files))
    .then(() => log(chalk.bold.green('🎉  Bootstrap'), chalk.bold.green('successful')))
    .catch(error => logError('🚨  Failed to perform bootstrap', error));
};

module.exports = bootstrap;

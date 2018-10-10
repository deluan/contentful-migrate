const chalk = require('chalk');
const log = require('migrate/lib/log');
const logError = require('migrate/lib/log').error;

const generateScripts = require('./bootstrap/generateScripts');
const deleteScripts = require('./bootstrap/deleteScripts');
const rewriteMigration = require('./bootstrap/rewriteMigration');

const bootstrap = async (
  spaceId,
  environmentId,
  contentTypes,
  accessToken,
  migrationsDirectory,
  writeMigrationState
) => {
  try {
    await deleteScripts(migrationsDirectory, contentTypes);
    const files = await generateScripts(spaceId, environmentId, contentTypes, accessToken, migrationsDirectory);
    if (writeMigrationState) {
      rewriteMigration(spaceId, environmentId, accessToken, files);
    }
    log(chalk.bold.green('🎉  Bootstrap'), chalk.bold.green('successful'));
  } catch (error) {
    logError('🚨  Failed to perform bootstrap', error);
  }
};

module.exports = bootstrap;

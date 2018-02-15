const log = require('migrate/lib/log');
const logError = require('migrate/lib/log').error;
const rimraf = require('rimraf');

const deleteScripts = (migrationsDirectory) => {
  return new Promise((resolve, reject) => {
    return rimraf(migrationsDirectory, (error) => {
      if (error) {
        reject(logError('🚨   Failed to delete migrations folder', error));
      }
      resolve(log('Migrations folder', 'deleted'));
    });
  });
};

module.exports = deleteScripts;

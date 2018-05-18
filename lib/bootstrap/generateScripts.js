const contentful = require('contentful-management');
const chalk = require('chalk');
const log = require('migrate/lib/log');

const createFile = require('./createFile');
const { jsonToScript } = require('./jsonToScript');

const generateScripts = (spaceId, environmentId, accessToken, migrationsDirectory) => {
  const client = contentful.createClient({ accessToken });
  return client.getSpace(spaceId)
    .then(space => space.getEnvironment(environmentId))
    // TODO: add pagination when content type exceeds 1000
    .then(environment => environment.getContentTypes({ limit: 1000 }))
    .then(response => response.items.filter(item => item.sys.id !== 'migration'))
    .then(items => Promise.all(items.map((item) => {
      return createFile(item.sys.id, jsonToScript(item), migrationsDirectory);
    })))
    .then((files) => {
      log(chalk.bold.green('🎉  Scripts generation'), chalk.bold.green('successful'));
      return files;
    });
};

module.exports = generateScripts;

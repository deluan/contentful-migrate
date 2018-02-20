const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const log = require('migrate/lib/log');
const migrate = require('migrate');
const { ContentfulStore, initializeStoreStates } = require('../lib/store');
const run = require('../lib/run');


const loadAsync = promisify(migrate.load);

const runWrapper = (args) => {
  return (next) => {
    const argsWithNext = Object.assign({}, args, { next });
    run(argsWithNext);
  };
};

const configureSet = (set, spaceId, accessToken, dryRun) => {
  set.migrations.forEach((migration) => {
    /* eslint-disable no-param-reassign */
    if (migration.up) {
      const migrationFunction = migration.up;
      migration.up = runWrapper({
        migrationFunction, spaceId, accessToken, dryRun
      });
    }
    if (migration.down) {
      const migrationFunction = migration.down;
      migration.down = runWrapper({
        migrationFunction, spaceId, accessToken, dryRun
      });
    }
    /* eslint-enable no-param-reassign */
  });

  set.on('warning', (msg) => {
    log('warning', msg);
  });

  set.on('migration', (migration, direction) => {
    log(direction, migration.title);
  });

  return set;
};

const readContentTypes = (migrationsDirectory) => {
  const contentTypeList = [];
  if (contentTypeList.length === 0) {
    const isDirectory = source =>
      fs.lstatSync(path.join(migrationsDirectory, source)).isDirectory();
    fs.readdirSync(migrationsDirectory)
      .filter(isDirectory).forEach(dir => contentTypeList.push(dir));
  }
  return contentTypeList;
};

// Load in migrations. Return an array of MigrationSet promises
const load = async ({
  migrationsDirectory, spaceId, accessToken, dryRun, contentTypes
}) => {
  let contentTypeList = contentTypes;
  if (typeof contentTypes === 'undefined' || contentTypes.length === 0) {
    contentTypeList = readContentTypes(migrationsDirectory);
  }

  await initializeStoreStates(accessToken, spaceId);

  return contentTypeList.map((contentType) => {
    const store = new ContentfulStore({
      spaceId, contentType, accessToken, dryRun
    });
    const contentTypeDirectory = path.join(migrationsDirectory, contentType);
    return loadAsync({ stateStore: store, migrationsDirectory: contentTypeDirectory })
      .then(set => configureSet(set, spaceId, accessToken, dryRun));
  });
};

module.exports = load;

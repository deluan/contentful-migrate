const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const log = require('migrate/lib/log');
const migrate = require('migrate');
const { createStoreFactory } = require('../lib/store');
const run = require('../lib/run');
const { CONFIG_FILE_NAME } = require('./config');


const loadAsync = promisify(migrate.load);

const runWrapper = (args) => {
  return (next) => {
    const argsWithNext = Object.assign({}, args, { next });
    run(argsWithNext);
  };
};

const configureSet = (set, spaceId, environmentId, accessToken, dryRun) => {
  set.migrations.forEach((migration) => {
    /* eslint-disable no-param-reassign */
    if (migration.up) {
      const migrationFunction = migration.up;
      migration.up = runWrapper({
        migrationFunction, spaceId, environmentId, accessToken, dryRun
      });
    }
    if (migration.down) {
      const migrationFunction = migration.down;
      migration.down = runWrapper({
        migrationFunction, spaceId, environmentId, accessToken, dryRun
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
      .filter(isDirectory)
      .forEach(dir => contentTypeList.push(dir));
  }
  return contentTypeList;
};

// Load in migrations. Return an array of MigrationSet promises
const load = async ({
  migrationsDirectory,
  spaceId,
  environmentId,
  accessToken,
  folders,
  dryRun
}) => {
  const factory = await createStoreFactory({
    accessToken,
    dryRun,
    environmentId,
    spaceId
  });

  const isConsolidated = typeof folders === 'undefined';
  if (isConsolidated) {
    const store = factory.newStore();
    const set = loadAsync({
      stateStore: store,
      migrationsDirectory,
      filterFunction: file => file !== CONFIG_FILE_NAME
    })
      .then(set => configureSet(set, spaceId, environmentId, accessToken, dryRun));

    return [set];
  }

  const folderList = folders.length === 0 ? readContentTypes(migrationsDirectory) : folders;

  return folderList.map((folder) => {
    const store = factory.newStore(folder);
    const folderPath = path.join(migrationsDirectory, folder);
    return loadAsync({ stateStore: store, migrationsDirectory: folderPath })
      .then(set => configureSet(set, spaceId, environmentId, accessToken, dryRun));
  });
};

module.exports = load;

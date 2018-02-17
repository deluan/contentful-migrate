const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const log = require('migrate/lib/log');
const migrate = require('migrate');
const Store = require('../lib/store');
const run = require('../lib/run');


const loadAsync = promisify(migrate.load);

const runWrapper = (args) => {
  return (next) => {
    const argsWithNext = Object.assign({}, args, { next });
    run(argsWithNext);
  };
};

const configureSet = (set, spaceId, accessToken, dryrun) => {
  set.migrations.forEach((migration) => {
    /* eslint-disable no-param-reassign */
    if (migration.up) {
      const migrationFunction = migration.up;
      migration.up = runWrapper({
        migrationFunction, spaceId, accessToken, dryrun
      });
    }
    if (migration.down) {
      const migrationFunction = migration.down;
      migration.down = runWrapper({
        migrationFunction, spaceId, accessToken, dryrun
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

// Load in migrations. Return an array of MigrationSet promises
const load = ({
  migrationsDirectory, spaceId, accessToken, dryrun, contentTypes
}) => {
  const contentTypeList = contentTypes || [];
  if (contentTypeList.length === 0) {
    const isDirectory = source =>
      fs.lstatSync(path.join(migrationsDirectory, source)).isDirectory();
    fs.readdirSync(migrationsDirectory)
      .filter(isDirectory).forEach(dir => contentTypeList.push(dir));
  }

  return contentTypeList.map((contentType) => {
    const store = new Store({
      spaceId, contentType, accessToken, dryrun
    });
    const contentTypeDirectory = path.join(migrationsDirectory, contentType);
    return loadAsync({ stateStore: store, migrationsDirectory: contentTypeDirectory })
      .then(set => configureSet(set, spaceId, accessToken, dryrun));
  });
};

module.exports = load;

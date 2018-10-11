const path = require('path');
const { promisify } = require('util');
const log = require('migrate/lib/log');
const migrate = require('migrate');
const { createStoreFactory } = require('../lib/store');
const run = require('../lib/run');


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

// Load in migrations. Return an array of MigrationSet promises
const load = async ({
  migrationsDirectory,
  spaceId,
  environmentId,
  accessToken,
  dryRun
}) => {
  const factory = await createStoreFactory({
    accessToken,
    dryRun,
    environmentId,
    spaceId
  });

  const store = factory.newStore();
  const set = loadAsync({ stateStore: store, migrationsDirectory })
    .then(set => configureSet(set, spaceId, environmentId, accessToken, dryRun));

  return [set];
};

module.exports = load;

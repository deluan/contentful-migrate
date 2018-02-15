const { promisify } = require('util');
const log = require('migrate/lib/log');
const migrate = require('migrate');
const Store = require('../lib/store');
const run = require('../lib/run');


const loadAsync = promisify(migrate.load);

const mergeSets = (sets) => {
  return sets[0]; // TODO actual merge of all sets
};

const runWrapper = (args) => {
  return (next) => {
    const argsWithNext = Object.assign({}, args, { next });
    run(argsWithNext);
  };
};

// Load in migrations
const load = ({
  migrationsDirectory, spaceId, accessToken, dryrun, contentTypes
}) => {
  const loads = contentTypes.map((contentType) => {
    const store = new Store({
      spaceId, contentType, accessToken, dryrun
    });
    return loadAsync({ stateStore: store, migrationsDirectory });
  });

  return Promise.all(loads)
    .then(sets => mergeSets(sets))
    .then((set) => {
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
    });
};

module.exports = load;

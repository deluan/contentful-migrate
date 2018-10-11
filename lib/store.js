const contentful = require('contentful-management');
const run = require('./run');
const _ = require('lodash');

let cachedState;

const SINGLE_MIGRATION_ENTRY_ID = 'history';

const queryParams = {
  content_type: 'migration',
  limit: 1000
};

let defaultSpaceLocale;

const getDefaultLocale = async (accessToken, spaceId, environmentId) => {
  const client = contentful.createClient({ accessToken });
  const loc = await client.getSpace(spaceId)
    .then(space => space.getEnvironment(environmentId))
    .then(space => space.getLocales())
    .then(response => response.items.find(l => l.default));
  return loc.code;
};

const initSpace = (accessToken, spaceId, environmentId) => {
  const migrationFunction = (migration) => {
    const contentType = migration.createContentType('migration')
      .name('Migration')
      .displayField('entryTitle')
      .description('Meta data to store the state of content model through migrations');

    contentType.createField('entryTitle')
      .name('Entry Title')
      .type('Symbol')
      .required(true)
      .validations([{ unique: true }]);

    contentType.createField('state')
      .name('Migration State')
      .type('Object')
      .required(true);
  };
  const args = {
    spaceId,
    environmentId: environmentId || 'master',
    accessToken,
    dryRun: false,
    migrationFunction,
    next: () => {
    }
  };
  return run(args);
};

const initializeStoreStates = async (accessToken, spaceId, environmentId) => {
  if (typeof cachedState !== 'undefined') {
    return cachedState;
  }

  const client = contentful.createClient({ accessToken });
  cachedState = await client.getSpace(spaceId)
    .then(space => space.getEnvironment(environmentId))
    .then(space => space.getEntries(queryParams))
    .then(entries => _.reduce(entries.items, (acc, entry) => {
      const contentType = entry.fields.entryTitle[defaultSpaceLocale];
      acc[contentType] = entry.fields.state[defaultSpaceLocale];
      return acc;
    }, {}));
  return cachedState;
};

class ContentfulStore {
  constructor ({
    spaceId, environmentId, contentType, accessToken, dryRun, locale
  }) {
    this.spaceId = spaceId;
    this.entryId = contentType || SINGLE_MIGRATION_ENTRY_ID;
    this.environmentId = environmentId;
    this.accessToken = accessToken;
    this.dryRun = dryRun;
    this.client = contentful.createClient({ accessToken });
    this.queryParams = Object.assign({}, queryParams, { 'fields.entryTitle': this.entryId });
    this.locale = locale || defaultSpaceLocale;
    return this;
  }

  createStateFrom (set) {
    const migrations = set.migrations.filter(m => m.timestamp);
    return {
      [this.locale]: {
        lastRun: set.lastRun,
        migrations: migrations
      }
    };
  }

  isSetEmpty (set) {
    return set.migrations.filter(m => m.timestamp).length === 0;
  }

  deleteState () {
    return this.client.getSpace(this.spaceId)
      .then(space => space.getEnvironment(this.environmentId))
      .then((space) => space.getEntry(this.entryId))
      .then((entry) => entry.delete());
  }

  writeState (set) {
    if (this.isSetEmpty(set)) {
      return this.deleteState();
    }
    return this.client.getSpace(this.spaceId)
      .then(space => space.getEnvironment(this.environmentId))
      .then(space => space.getEntries(this.queryParams))
      .then((entries) => {
        if (entries.total === 0) {
          return this.client.getSpace(this.spaceId)
            .then(space => space.getEnvironment(this.environmentId))
            .then(space => space.createEntryWithId('migration', this.entryId, {
              fields: {
                entryTitle: { [this.locale]: this.entryId },
                state: this.createStateFrom(set)
              }
            }));
        }
        const entry = entries.items[0];
        entry.fields.state = this.createStateFrom(set);
        return entry.update();
      });
  }

  save (set, fn) {
    if (this.dryRun) {
      return fn();
    }
    return this.writeState(set)
      .then(() => fn())
      .catch(error => fn(error));
  }

  load (fn) {
    const state = cachedState[this.entryId];
    if (typeof state !== 'undefined') {
      return fn(null, state);
    }
    return fn(null, {});
  }

  init () {
    return initSpace(this.accessToken, this.spaceId, this.environmentId);
  }
}

const createStoreFactory = async ({
  accessToken, spaceId, environmentId, dryRun
}) => {
  defaultSpaceLocale = defaultSpaceLocale || await getDefaultLocale(accessToken, spaceId, environmentId);
  await initializeStoreStates(accessToken, spaceId, environmentId);

  return {
    newStore: contentType =>
      new ContentfulStore({
        accessToken, spaceId, environmentId, contentType, dryRun
      })
  };
};

module.exports = { initSpace, createStoreFactory, ContentfulStore };

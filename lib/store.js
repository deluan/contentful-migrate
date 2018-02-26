const contentful = require('contentful-management');
const run = require('./run');
const _ = require('lodash');

let cachedState;

const queryParams = {
  content_type: 'migration',
  limit: 1000
};

let locale;

const getDefaultLocale = async (accessToken, spaceId) => {
  const client = contentful.createClient({ accessToken });
  const loc = await client.getSpace(spaceId)
    .then(space => space.getLocales())
    .then(response => response.items.find(l => l.default));
  return loc.code;
};

const initSpace = (accessToken, spaceId) => {
  const migrationFunction = (migration) => {
    const contentType = migration.createContentType('migration')
      .name('Migration')
      .displayField('contentTypeId')
      .description('Meta data to store the state of content model through migrations');

    contentType.createField('state')
      .name('Migration State')
      .type('Object')
      .required(true);

    contentType.createField('contentTypeId')
      .name('Content Type ID')
      .type('Symbol')
      .required(true)
      .validations([{ unique: true }]);
  };
  const args = {
    spaceId,
    accessToken,
    dryRun: false,
    migrationFunction,
    next: () => {
    }
  };
  return run(args);
};

const initializeStoreStates = async (accessToken, spaceId) => {
  if (typeof cachedState !== 'undefined') {
    return cachedState;
  }

  const client = contentful.createClient({ accessToken });
  cachedState = await client.getSpace(spaceId)
    .then(space => space.getEntries(queryParams))
    .then(entries => _.reduce(entries.items, (acc, entry) => {
      const contentType = entry.fields.contentTypeId[locale];
      acc[contentType] = entry.fields.state[locale];
      return acc;
    }, {}));
  return cachedState;
};

class ContentfulStore {
  constructor({
    spaceId, contentType, accessToken, dryRun
  }) {
    this.spaceId = spaceId;
    this.contentTypeID = contentType;
    this.accessToken = accessToken;
    this.dryRun = dryRun;
    this.client = contentful.createClient({ accessToken });
    this.queryParams = Object.assign({}, queryParams, { 'fields.contentTypeId': this.contentTypeID });
    return this;
  }

  createStateFrom(set) {
    return {
      [locale]: {
        lastRun: set.lastRun,
        migrations: set.migrations
      }
    };
  }

  writeMigration(set) {
    return this.client.getSpace(this.spaceId)
      .then(space => space.getEntries(this.queryParams))
      .then((entries) => {
        if (entries.total === 0) {
          return this.client.getSpace(this.spaceId)
            .then(space => space.createEntryWithId('migration', this.contentTypeID, {
              fields: {
                contentTypeId: { [locale]: this.contentTypeID },
                state: this.createStateFrom(set)
              }
            }));
        }
        const entry = entries.items[0];
        entry.fields.state = this.createStateFrom(set);
        return entry.update();
      });
  }

  save(set, fn) {
    if (this.dryRun) {
      return fn();
    }
    return this.writeMigration(set)
      .then(() => fn())
      .catch(error => fn(error));
  }

  load(fn) {
    const state = cachedState[this.contentTypeID];
    if (typeof state !== 'undefined') {
      return fn(null, state);
    }
    return fn(null, {});
  }

  init() {
    return initSpace(this.accessToken, this.spaceId);
  }
}

const createStoreFactory = async ({ accessToken, spaceId, dryRun }) => {
  locale = locale || await getDefaultLocale(accessToken, spaceId);
  await initializeStoreStates(accessToken, spaceId);

  return {
    newStore: contentType =>
      new ContentfulStore({
        accessToken, spaceId, contentType, dryRun
      })
  };
};

module.exports = { initSpace, createStoreFactory };

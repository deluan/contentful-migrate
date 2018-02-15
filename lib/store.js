const contentful = require('contentful-management');
const run = require('./run');

class ContentfulStore {
  constructor({
    spaceId, contentType, accessToken, dryrun
  }) {
    this.spaceId = spaceId;
    this.contentTypeID = contentType;
    this.accessToken = accessToken;
    this.dryrun = dryrun;
    this.client = contentful.createClient({ accessToken });
    this.queryParams = {
      content_type: 'migration',
      'fields.contentTypeId': this.contentTypeID
    };
    return this;
  }

  createStateFrom(set) {
    return {
      'en-CA': {
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
                contentTypeId: { 'en-CA': this.contentTypeID },
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
    if (this.dryrun) {
      return fn();
    }
    return this.writeMigration(set)
      .then(() => fn())
      .catch(error => fn(error));
  }

  load(fn) {
    return this.client.getSpace(this.spaceId)
      .then(space => space.getEntries(this.queryParams))
      .then((entries) => {
        if (entries.total === 0) return fn(null, {});
        return fn(null, entries.items[0].fields.state['en-CA']);
      })
      .catch(error => fn(error));
  }

  init() {
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
      spaceId: this.spaceId,
      accessToken: this.accessToken,
      dryrun: false,
      migrationFunction,
      next: () => {}
    };
    return run(args);
  }
}

module.exports = ContentfulStore;

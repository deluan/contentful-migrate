const log = require('migrate/lib/log');

const { ContentfulStore, initializeStoreStates } = require('../store');

const rewriteMigration = async (spaceId, accessToken, files) => {
  await initializeStoreStates(accessToken, spaceId);

  return Promise.all(files.map((file) => {
    const contentType = file.contentTypeId;
    const set = {
      lastRun: file.fileName,
      migrations: [{
        title: file.fileName,
        timestamp: Date.now(),
        description: `Create content model for ${contentType}`
      }]
    };
    const store = new ContentfulStore({ spaceId, contentType, accessToken });
    return store.writeMigration(set)
      .then(() => log('Wrote contentful migration state', contentType));
  }));
};

module.exports = rewriteMigration;

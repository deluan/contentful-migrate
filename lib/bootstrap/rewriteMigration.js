const log = require('migrate/lib/log');

const { createStoreFactory } = require('../store');

const rewriteMigration = async (spaceId, accessToken, files) => {
  const factory = await createStoreFactory({ accessToken, spaceId });

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
    const store = factory.newStore(contentType);
    return store.writeMigration(set)
      .then(() => log('Wrote contentful migration state', contentType));
  }));
};

module.exports = rewriteMigration;

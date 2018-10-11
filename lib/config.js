const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const MIGRATION_FOLDER = path.join('.', 'migrations');
const CONFIG_FILE_NAME = 'config.json';
const CONFIG_FILE_PATH = path.join(MIGRATION_FOLDER, CONFIG_FILE_NAME);

const initialize = (consolidated) => {
  mkdirp.sync(MIGRATION_FOLDER);

  const config = { consolidated };

  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2));
};

const isConsolidated = () => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH));
    return config.consolidated;
  } catch (e) {
    return false;
  }
};

module.exports = {
  CONFIG_FILE_NAME,
  initialize,
  isConsolidated: isConsolidated()
};

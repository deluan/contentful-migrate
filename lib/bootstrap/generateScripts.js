const contentful = require('contentful-management');
const chalk = require('chalk');
const log = require('migrate/lib/log');

const createFile = require('./createFile');
const { jsonToScript } = require('./jsonToScript');

const generateScripts = async (spaceId, environmentId, accessToken, migrationsDirectory) => {
  const client = contentful.createClient({ accessToken });
  const space = await client.getSpace(spaceId);
  const environment = await space.getEnvironment(environmentId);
  // TODO: add pagination when content type exceeds 1000
  const contentTypeResponse = await environment.getContentTypes({ limit: 1000 });
  const contentTypes = contentTypeResponse.items.filter(item => item.sys.id !== 'migration');
  const files = await Promise.all(contentTypes.map(async (contentType) => {
    const contentTypeId = contentType.sys.id;
    const editorInterface = await environment.getEditorInterfaceForContentType(contentTypeId);
    return createFile(
      contentTypeId,
      jsonToScript(contentType, editorInterface.controls),
      migrationsDirectory
    );
  }));
  log(chalk.bold.green('🎉  Scripts generation'), chalk.bold.green('successful'));
  return files;
};

module.exports = generateScripts;

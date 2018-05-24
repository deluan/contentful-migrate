const contentful = require('contentful-management');
const chalk = require('chalk');
const pMap = require('p-map');
const log = require('migrate/lib/log');

const createFile = require('./createFile');
const { jsonToScript } = require('./jsonToScript');

// Magic number to prevent overloading the contentful management API.
// TODO: passed in from bootstrap command as an option
const concurrency = 5;

const generateScripts = async (spaceId, environmentId, accessToken, migrationsDirectory) => {
  const client = contentful.createClient({ accessToken });
  const space = await client.getSpace(spaceId);
  const environment = await space.getEnvironment(environmentId);
  // TODO: add pagination when content type exceeds 1000
  const contentTypeResponse = await environment.getContentTypes({ limit: 1000 });
  const contentTypes = contentTypeResponse.items.filter(item => item.sys.id !== 'migration');
  const mapper = (contentType) => {
    const contentTypeId = contentType.sys.id;
    return environment.getEditorInterfaceForContentType(contentTypeId)
      .then((editorInterface) => {
        return createFile(
          contentTypeId,
          jsonToScript(contentType, editorInterface.controls),
          migrationsDirectory
        );
      });
  };

  const files = await pMap(contentTypes, mapper, { concurrency });
  log(chalk.bold.green('🎉  Scripts generation'), chalk.bold.green('successful'));
  return files;
};

module.exports = generateScripts;

// TODO Refactor this mess! This code was adapted from the transpiled version of
// https://github.com/contentful/migration-cli/blob/master/src/bin/cli.ts

/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */

const path = require('path');

const Listr = require('listr');
const chalk = require('chalk');
const contentfulClient = require('contentful-migration-cli/built/bin/lib/contentful-client');
const { version } = require('contentful-migration-cli/package.json');
const { SpaceAccessError } = require('contentful-migration-cli/built/lib/errors');
const migrationParser1 = require('contentful-migration-cli/built/lib/migration-parser');
const renderMigration = require('contentful-migration-cli/built/bin/lib/render-migration');
const stepsError = require('contentful-migration-cli/built/bin/lib/steps-errors');
const writeErrorsToLog = require('contentful-migration-cli/built/bin/lib/write-errors-to-log');
const Fetcher = require('contentful-migration-cli/built/lib/fetcher').default;


class BatchError extends Error {
  constructor(message, batch, errors) {
    super(message);
    this.batch = batch;
    this.errors = errors;
  }
}

const run = async ({
  spaceId, accessToken, dryrun, migrationFunction
}) => {
  const config = { spaceId, accessToken };
  const clientConfig = Object.assign({
    application: `telus-contentful-migration/${version}`
  }, config);
  const client = contentfulClient.createManagementClient(clientConfig);

  const makeRequest = (requestConfig) => {
    // eslint-disable-next-line no-param-reassign
    requestConfig.url = path.join(config.spaceId, requestConfig.url);
    return client.rawRequest(requestConfig);
  };
  const fetcher = new Fetcher(makeRequest);
  const migrationParser = migrationParser1.default(fetcher);
  let parseResult;
  try {
    parseResult = await migrationParser(migrationFunction);
  } catch (e) {
    if (e instanceof SpaceAccessError) {
      const message = [
        chalk.red.bold(`${e.message}\n`),
        chalk.red.bold('🚨  Migration unsuccessful}')
      ].join('\n');
      console.log(message);
      process.exit(1);
    }
    console.log(e);
    process.exit(1);
  }
  if (parseResult.hasStepsValidationErrors()) {
    stepsError.default(parseResult.stepsValidationErrors);
    process.exit(1);
  }
  if (parseResult.hasPayloadValidationErrors()) {
    stepsError.default(parseResult.payloadValidationErrors);
    process.exit(1);
  }
  // const migrationName = path.basename(argv.filePath, '.js');
  // const errorsFile = path.join(process.cwd(), `errors-${migrationName}-${Date.now()}.log`);
  const errorsFile = path.join(process.cwd(), `errors-${Date.now()}.log`);
  const { batches } = parseResult;
  if (parseResult.hasValidationErrors()) {
    renderMigration.renderValidationErrors(batches);
    process.exit(1);
  }
  if (parseResult.hasRuntimeErrors()) {
    renderMigration.renderRuntimeErrors(batches, errorsFile);
    await writeErrorsToLog.default(parseResult.getRuntimeErrors(), errorsFile);
    process.exit(1);
  }
  await renderMigration.renderPlan(batches);
  const serverErrorsWritten = [];
  const tasks = batches.map((batch) => {
    return {
      title: batch.intent.toPlanMessage().heading,
      task: () => new Listr([
        {
          title: 'Making requests',
          task: async (_ctx, task) => {
            // TODO: We wanted to make this an async interator
            // So we should not inspect the length but have a property for that
            const numRequests = batch.requests.length;
            const requestErrors = [];
            let requestsDone = 0;
            for (const request of batch.requests) {
              requestsDone += 1;

              /* eslint-disable no-param-reassign */
              task.title = `Making requests (${requestsDone}/${numRequests})`;
              task.output = `${request.method} ${request.url} at V${request.headers['X-Contentful-Version']}`;
              /* eslint-enable no-param-reassign */

              await makeRequest(request).catch((error) => {
                serverErrorsWritten.push(writeErrorsToLog.default(error, errorsFile));
                const parsed = JSON.parse(error.message);
                const errorMessage = {
                  status: parsed.statusText,
                  message: parsed.message,
                  details: parsed.details,
                  url: parsed.request.url
                };
                requestErrors.push(new Error(JSON.stringify(errorMessage)));
              });
            }
            // Finish batch and only then throw all errors in there
            if (requestErrors.length) {
              throw new BatchError('Batch failed', batch, requestErrors);
            }
          }
        }
      ])
    };
  });
  if (!dryrun) {
    try {
      const successfulMigration = await (new Listr(tasks)).run();
      console.log(chalk.bold.green('🎉  Migration successful'));
      return successfulMigration;
    } catch (err) {
      console.log(chalk.bold.red('🚨  Migration unsuccessful: '));
      console.log(chalk.red(`${err.message}\n`));
      err.errors.forEach(error => console.log(chalk.red(`${error}\n\n`)));
      await Promise.all(serverErrorsWritten);
      console.log(`Please check the errors log for more details: ${errorsFile}`);
      throw err;
    }
  }
  return console.log(chalk.bold.yellow('⚠️  Dry run completed'));
};

module.exports = (args) => {
  return run(args)
    .then(() => args.next())
    .catch(err => args.next(err));
};

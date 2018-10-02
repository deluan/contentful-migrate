const contentful = require('contentful-management');
const dateformat = require('dateformat');
const expect = require('expect.js');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const accessToken = process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
const spaceId = process.env.CONTENTFUL_SPACE_ID;
const environmentId = `test-${dateformat(new Date(), 'UTC:yyyymmddHHMMss')}`;

const TIME_OUT = 30000; // in milliseconds
const NODE_CMD = 'node';
const MIGRATION_CMD = 'bin/ctf-migrate';
const MIGRATIONS_FOLDER = path.join(process.cwd(), 'migrations');
const TOKEN_SPACE_ENV_OPTIONS = ['-t', accessToken, '-s', spaceId, '-e', environmentId];

if (!accessToken) {
  throw new Error('Missing CONTENTFUL_MANAGEMENT_ACCESS_TOKEN in ENV!');
}

if (!spaceId) {
  throw new Error('Missing CONTENTFUL_SPACE_ID in ENV!');
}

const client = contentful.createClient({ accessToken });

let defaultLocale;
let environment;

// using function because arrow functions can't set timeout in mocha... what?
async function createTestEnvironment () {
  this.timeout(TIME_OUT);
  const space = await client.getSpace(spaceId);
  environment = await space.createEnvironmentWithId(environmentId, { name: environmentId });
  defaultLocale = await environment.getLocales()
    .then(response => response.items.find(locale => locale.default))
    .then(locale => locale.code);
  return true;
}

// using function because arrow functions can't set timeout in mocha... what?
async function deleteTestEnvironment () {
  this.timeout(TIME_OUT);
  spawnSync('rm', ['-r', MIGRATIONS_FOLDER]);
  return environment.delete();
}

describe('Integration Test', () => {
  before(createTestEnvironment);

  after(deleteTestEnvironment);

  describe('init command', () => {
    it('should create the migration content model @integration', async () => {
      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'init', ...TOKEN_SPACE_ENV_OPTIONS]
      );
      const migration = await environment.getContentType('migration');
      const { name, displayField, fields } = migration;
      expect(name).to.be('Migration');
      expect(displayField).to.be('contentTypeId');
      expect(fields).to.have.length(2);
      const [state, contentTypeId] = fields;
      expect(state.type).to.be('Object');
      expect(contentTypeId.type).to.be('Symbol');
    }).timeout(TIME_OUT);
  });

  describe('create command', () => {
    it('should create a template file in migrations folder @integration', async () => {
      const contentType = 'horse';
      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'create', '-c', contentType, `create-${contentType}`]
      );
      const contentTypes = fs.readdirSync(MIGRATIONS_FOLDER);
      expect(contentTypes).to.have.length(1);
      expect(contentTypes[0]).to.be(contentType);
      const migrationScripts = fs.readdirSync(path.join(process.cwd(), `migrations/${contentType}`));
      const fileNameMatcher = `\\d{14}-create-${contentType}.js`;
      const fileNameRegExp = new RegExp(fileNameMatcher);
      expect(migrationScripts[0]).to.match(fileNameRegExp);
    }).timeout(TIME_OUT);
  });

  describe('up command', () => {
    it('-d option should not apply migration @integration', async () => {
      const contentType = 'horse';

      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'up', '-c', contentType, '-d', ...TOKEN_SPACE_ENV_OPTIONS]
      );

      const migrations = await environment.getEntries({ content_type: 'migration' });
      expect(migrations.items).to.have.length(0);
    }).timeout(TIME_OUT);

    it('-c option should apply migration for specified contentType @integration', async () => {
      const contentType = 'horse';

      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'up', '-c', contentType, ...TOKEN_SPACE_ENV_OPTIONS]
      );

      const migrations = await environment.getEntries({ content_type: 'migration' });
      expect(migrations.items).to.have.length(1);

      const migration = migrations.items[0];
      const migrationScriptsFolder = path.join(MIGRATIONS_FOLDER, contentType);
      const migrationScripts = fs.readdirSync(migrationScriptsFolder);
      const state = migration.fields.state[defaultLocale];

      const scriptsRan = state.migrations.map(migration => migration.title);
      expect(scriptsRan).to.have.length(1);

      migrationScripts.forEach((scriptName) => {
        expect(scriptsRan).to.contain(scriptName);
      });
    }).timeout(30000);

    it('-c on same content type without new script should not change last run @integration', async () => {
      const contentType = 'horse';

      const previousMigrations = await environment.getEntries({ content_type: 'migration' });
      const previousMigration = previousMigrations.items[0].fields.state[defaultLocale];
      const previousMigrationsLastRun = previousMigration.migrations[0].timestamp;

      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'up', '-c', contentType, ...TOKEN_SPACE_ENV_OPTIONS]
      );

      const migrations = await environment.getEntries({ content_type: 'migration' });

      const currentMigration = migrations.items[0].fields.state[defaultLocale];
      const currentMigrationLastRun = currentMigration.migrations[0].timestamp;
      expect(currentMigrationLastRun).to.be(previousMigrationsLastRun);
    }).timeout(30000);

    it('-c on same content type with new script should change last run @integration', async () => {
      const contentType = 'horse';

      // create another script
      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'create', '-c', contentType, `create-${contentType}`]
      );

      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'up', '-c', contentType, ...TOKEN_SPACE_ENV_OPTIONS]
      );

      const migrations = await environment.getEntries({ content_type: 'migration' });
      expect(migrations.items).to.have.length(1);

      const migration = migrations.items[0];
      const migrationScriptsFolder = path.join(MIGRATIONS_FOLDER, contentType);
      const migrationScripts = fs.readdirSync(migrationScriptsFolder);
      const state = migration.fields.state[defaultLocale];

      const scriptsRan = state.migrations.map(migration => migration.title);
      expect(scriptsRan).to.have.length(2);
      expect(state.lastRun).to.be(scriptsRan[scriptsRan.length - 1]);
      migrationScripts.forEach((scriptName) => {
        expect(scriptsRan).to.contain(scriptName);
      });
    }).timeout(30000);

    it('-a should run all content types not migrated @integration', async () => {
      const contentType = 'alpaca';

      // create script for different content type
      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'create', '-c', contentType, `create-${contentType}`]
      );

      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'up', '-a', ...TOKEN_SPACE_ENV_OPTIONS]
      );

      const migrations = await environment.getEntries({ content_type: 'migration' });
      expect(migrations.items).to.have.length(2);
    }).timeout(30000);
  });

  describe('down command', () => {
    it('-c option should apply down for the last migration in specified contentType @integration', async () => {
      const contentType = 'horse';

      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'down', '-c', contentType, ...TOKEN_SPACE_ENV_OPTIONS]
      );

      const migrations = await environment.getEntries({
        content_type: 'migration',
        'fields.contentTypeId': 'horse'
      });

      const migration = migrations.items[0];
      const state = migration.fields.state[defaultLocale];
      expect(state.migrations).to.have.length(1);
    }).timeout(30000);
  });
});

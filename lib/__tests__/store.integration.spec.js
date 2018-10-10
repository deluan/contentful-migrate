const contentful = require('contentful-management');
const dateformat = require('dateformat');
const expect = require('expect.js');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

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

describe('Integration Test @integration', () => {
  const contentType = 'horse';

  before(createTestEnvironment);

  after(deleteTestEnvironment);

  describe('init command', () => {
    it('should create the migration content model', async () => {
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
    it('should create a template file in migrations folder', async () => {
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
    it('-d option should not apply migration', async () => {
      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'up', '-c', contentType, '-d', ...TOKEN_SPACE_ENV_OPTIONS]
      );

      const migrations = await environment.getEntries({ content_type: 'migration' });
      expect(migrations.items).to.have.length(0);
    }).timeout(TIME_OUT);

    it('-c option should apply migration for specified contentType', async () => {
      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'up', '-c', contentType, ...TOKEN_SPACE_ENV_OPTIONS]
      );

      const migration = await environment.getEntry(contentType);
      const state = migration.fields.state[defaultLocale];
      const scriptsRan = state.migrations.map(migration => migration.title);
      expect(scriptsRan).to.have.length(1);

      const migrationScriptsFolder = path.join(MIGRATIONS_FOLDER, contentType);
      const migrationScripts = fs.readdirSync(migrationScriptsFolder);
      expect(migrationScripts).to.eql(scriptsRan);
    }).timeout(30000);

    it('-c on same content type without new script should not change last run', async () => {
      const previousMigration = await environment.getEntry(contentType);
      const previousMigrationsLastRun = previousMigration.fields.state[defaultLocale].migrations[0].timestamp;

      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'up', '-c', contentType, ...TOKEN_SPACE_ENV_OPTIONS]
      );

      const currentMigration = await environment.getEntry(contentType);
      const currentMigrationLastRun = currentMigration.fields.state[defaultLocale].migrations[0].timestamp;
      expect(currentMigrationLastRun).to.be(previousMigrationsLastRun);
    }).timeout(30000);

    it('-c on same content type with new script should change last run', async () => {
      // create another script
      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'create', '-c', contentType, `create-${contentType}`]
      );

      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'up', '-c', contentType, ...TOKEN_SPACE_ENV_OPTIONS]
      );

      const migration = await environment.getEntry(contentType);
      const state = migration.fields.state[defaultLocale];
      const scriptsRan = state.migrations.map(migration => migration.title);
      expect(scriptsRan).to.have.length(2);
      expect(state.lastRun).to.be(scriptsRan[scriptsRan.length - 1]);

      const migrationScriptsFolder = path.join(MIGRATIONS_FOLDER, contentType);
      const migrationScripts = fs.readdirSync(migrationScriptsFolder);
      expect(migrationScripts).to.eql(scriptsRan);
    }).timeout(30000);

    it('-a should run all content types not migrated', async () => {
      // create script for different content type
      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'create', '-c', 'alpaca', `create-${contentType}`]
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
    it('-c option should apply down for the last migration in specified contentType', async () => {
      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'down', '-c', contentType, ...TOKEN_SPACE_ENV_OPTIONS]
      );

      const migration = await environment.getEntry(contentType);
      const state = migration.fields.state[defaultLocale];
      expect(state.migrations).to.have.length(1);
    }).timeout(30000);

    it('-d option should not apply down migration', async () => {
      spawnSync(
        NODE_CMD,
        [MIGRATION_CMD, 'down', '-c', contentType, '-d', ...TOKEN_SPACE_ENV_OPTIONS]
      );

      const migration = await environment.getEntry(contentType);
      const state = migration.fields.state[defaultLocale];
      expect(state.migrations).to.have.length(1);
    }).timeout(30000);
  });

  describe('bootstrap command', () => {
    beforeEach(async () => {
      // delete migrations folder to set up for these set of tests
      spawnSync('rm', ['-r', MIGRATIONS_FOLDER]);
    });

    it('-c option with no response only creates script for content type', async () => {
      const contentTypeOptions = {
        name: 'Horse',
        fields: [{
          id: 'name',
          name: 'Name',
          type: 'Text'
        }]
      };
      await environment.createContentTypeWithId(contentType, contentTypeOptions)
        .then(createdContentType => createdContentType.publish());

      const command = `yes no | ${MIGRATION_CMD} bootstrap -c ${contentType} ${TOKEN_SPACE_ENV_OPTIONS.join(' ')}`;
      execSync(command);

      const contentTypes = fs.readdirSync(MIGRATIONS_FOLDER);
      expect(contentTypes).to.have.length(1);
      expect(contentTypes[0]).to.be(contentType);
      const migrationScripts = fs.readdirSync(path.join(process.cwd(), `migrations/${contentType}`));
      const fileNameMatcher = `\\d{14}-create-${contentType}.js`;
      const fileNameRegExp = new RegExp(fileNameMatcher);
      expect(migrationScripts[0]).to.match(fileNameRegExp);

      const migration = await environment.getEntry(contentType);
      const state = migration.fields.state[defaultLocale];
      const scriptsRan = state.migrations.map(migration => migration.title);
      expect(migrationScripts).to.not.eql(scriptsRan);
    }).timeout(30000);

    it('-c option with no response does not delete other folders in migrations', async () => {
      spawnSync('mkdir', ['-p', 'migrations/dont-delete-pony']);
      const command = `yes | ${MIGRATION_CMD} bootstrap -c ${contentType} ${TOKEN_SPACE_ENV_OPTIONS.join(' ')}`;
      execSync(command);

      const contentTypes = fs.readdirSync(MIGRATIONS_FOLDER);
      expect(contentTypes).to.have.length(2);
    }).timeout(30000);

    it('-a option with no response creates scripts for all content types', async () => {
      const contentTypeOptions = {
        name: 'Alpaca',
        fields: [{
          id: 'name',
          name: 'Name',
          type: 'Text'
        }]
      };
      await environment.createContentTypeWithId('alpaca', contentTypeOptions)
        .then(createdContentType => createdContentType.publish());

      const command = `yes no | ${MIGRATION_CMD} bootstrap -a ${TOKEN_SPACE_ENV_OPTIONS.join(' ')}`;
      execSync(command);

      const contentTypes = fs.readdirSync(MIGRATIONS_FOLDER);
      expect(contentTypes).to.have.length(2);
    }).timeout(30000);

    it('-c option with yes response creates the state for specific content type', async () => {
      const command = `yes | ${MIGRATION_CMD} bootstrap -c ${contentType} ${TOKEN_SPACE_ENV_OPTIONS.join(' ')}`;
      execSync(command);

      const migration = await environment.getEntry(contentType);
      const state = migration.fields.state[defaultLocale];
      const scriptsRan = state.migrations.map(migration => migration.title);
      expect(scriptsRan).to.have.length(1);

      const migrationScriptsFolder = path.join(MIGRATIONS_FOLDER, contentType);
      const migrationScripts = fs.readdirSync(migrationScriptsFolder);
      expect(migrationScripts).to.eql(scriptsRan);
    }).timeout(30000);

    it('-a option with yes overrides the state for all content type', async () => {
      const command = `yes | ${MIGRATION_CMD} bootstrap -a --danger-will-robinson-danger ${TOKEN_SPACE_ENV_OPTIONS.join(' ')}`;
      execSync(command);

      const migrations = await environment.getEntries({ content_type: 'migration' });
      migrations.items.forEach((migration) => {
        const state = migration.fields.state[defaultLocale];
        const scriptsRan = state.migrations.map(migration => migration.title);
        expect(scriptsRan).to.have.length(1);

        const migrationScriptsFolder = path.join(MIGRATIONS_FOLDER, migration.sys.id);
        const migrationScripts = fs.readdirSync(migrationScriptsFolder);
        expect(migrationScripts).to.eql(scriptsRan);
      });
    }).timeout(30000);
  });
});

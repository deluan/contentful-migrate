const contentful = require('contentful-management');
const dateformat = require('dateformat');
const expect = require('expect.js');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const accessToken = process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
const spaceId = process.env.CONTENTFUL_SPACE_ID;
const environmentId = `test-${dateformat(new Date(), 'UTC:yyyymmddHHMMss')}`;
let defaultLocale;

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

// using function because arrow functions can't set timeout in mocha... what?
async function createTestEnvironment () {
  this.timeout(TIME_OUT);
  const space = await client.getSpace(spaceId);
  const environment = await space.createEnvironmentWithId(environmentId, { name: environmentId });
  defaultLocale = await environment.getLocales()
    .then(response => response.items.find(locale => locale.default))
    .then(locale => locale.code);
  return true;
}

// using function because arrow functions can't set timeout in mocha... what?
async function deleteTestEnvironment () {
  this.timeout(TIME_OUT);
  spawnSync('rm', ['-r', MIGRATIONS_FOLDER]);
  const space = await client.getSpace(spaceId);
  const environment = await space.getEnvironment(environmentId);
  return environment.delete();
}

describe('Integration Test', () => {
  before(createTestEnvironment);

  after(deleteTestEnvironment);

  it('init command should create the migration content model @integration', async () => {
    spawnSync(
      NODE_CMD,
      [MIGRATION_CMD, 'init', ...TOKEN_SPACE_ENV_OPTIONS]
    );
    const contentTypes = await client.getSpace(spaceId)
      .then(space => space.getEnvironment(environmentId))
      .then(environment => environment.getContentTypes());
    expect(contentTypes.items).to.have.length(1);
    const migration = contentTypes.items[0];
    const { name, displayField, fields } = migration;
    expect(name).to.be('Migration');
    expect(displayField).to.be('contentTypeId');
    expect(fields).to.have.length(2);
    const [state, contentTypeId] = fields;
    expect(state.type).to.be('Object');
    expect(contentTypeId.type).to.be('Symbol');
  }).timeout(TIME_OUT);

  it('create command should create a template file in migrations folder @integration', async () => {
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

  it('up -c command should apply migration for specificed contentType @integration', async () => {
    const contentType = 'horse';

    // create another script
    spawnSync(
      NODE_CMD,
      [MIGRATION_CMD, 'create', '-c', contentType, `modify-${contentType}`]
    );

    spawnSync(
      NODE_CMD,
      [MIGRATION_CMD, 'up', '-c', contentType, ...TOKEN_SPACE_ENV_OPTIONS]
    );

    const migrations = await client.getSpace(spaceId)
      .then(space => space.getEnvironment(environmentId))
      .then(environment => environment.getEntries({
        content_type: 'migration'
      }));
    expect(migrations.items).to.have.length(1);

    const migration = migrations.items[0];
    const migrationScripts = fs.readdirSync(path.join(process.cwd(), `migrations/${contentType}`));
    const scriptsRan = migration.fields.state[defaultLocale].migrations.map(migration => migration.title);

    expect(scriptsRan).to.have.length(2);
    migrationScripts.forEach((scriptName) => {
      expect(scriptsRan).to.contain(scriptName);
    });
  }).timeout(TIME_OUT);
});

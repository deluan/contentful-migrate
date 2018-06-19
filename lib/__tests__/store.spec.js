const contentful = require('contentful-management');
const dateformat = require('dateformat');
const expect = require('expect.js');

const { initSpace } = require('../store');

const accessToken = process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
const spaceId = process.env.CONTENTFUL_SPACE_ID;
const environmentId = `test-${dateformat(new Date(), 'UTC:yyyymmddHHMMss')}`;

if (!accessToken) {
  throw new Error('Missing CONTENTFUL_MANAGEMENT_ACCESS_TOKEN in ENV!');
}

if (!spaceId) {
  throw new Error('Missing CONTENTFUL_SPACE_ID in ENV!');
}

const client = contentful.createClient({ accessToken });

// using function because arrow functions can't set timeout in mocha... what?
async function createTestEnvironment () {
  this.timeout(10000);
  const space = await client.getSpace(spaceId);
  return space.createEnvironmentWithId(environmentId, { name: environmentId });
}

// using function because arrow functions can't set timeout in mocha... what?
async function deleteTestEnvironment () {
  this.timeout(10000);
  const space = await client.getSpace(spaceId);
  const environment = await space.getEnvironment(environmentId);
  return environment.delete();
}

describe('Integration Test', () => {
  before(createTestEnvironment);

  after(deleteTestEnvironment);

  it('should create the migration content model @integration', async () => {
    await initSpace(accessToken, spaceId, environmentId);
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
  }).timeout(30000);
});

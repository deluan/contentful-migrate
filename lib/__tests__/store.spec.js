const contentful = require('contentful-management');
const dateformat = require('dateformat');
const expect = require('expect.js');

const { initSpace } = require('../store');

const accessToken = process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
const organizationId = process.env.ORGANIZATION_ID;
const client = contentful.createClient({ accessToken });
const defaultLocale = 'en-CA';
const testSpaceName = `test-${dateformat(new Date(), 'UTC:yyyymmddHHMMss')}`;
let spaceId;

// using function because arrow functions can't set timeout in mocha... what?
function createTestSpace () {
  this.timeout(10000);
  if (!organizationId) {
    throw new Error('Missing ORGANIZATION_ID in ENV!');
  }
  return client.createSpace({ name: testSpaceName, defaultLocale }, organizationId)
    .then((space) => {
      spaceId = space.sys.id;
      return spaceId;
    });
}

// using function because arrow functions can't set timeout in mocha... what?
function deleteTestSpace () {
  this.timeout(10000);
  if (!organizationId) {
    return true;
  }
  return spaceId && client.getSpace(spaceId).then(space => space.delete());
}

describe('Store', () => {
  beforeEach(createTestSpace);

  afterEach(deleteTestSpace);

  describe('initSpace', () => {
    it('should create the migration content model in space and master environment @integration', async () => {
      await initSpace(accessToken, spaceId);
      const contentTypes = await client.getSpace(spaceId)
        .then(space => space.getEnvironment('master'))
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

    it('should create the migration content model in space and new environment @integration', async () => {
      // create an environment to init
      const environmentId = await client.getSpace(spaceId)
        .then(space => space.createEnvironment({ name: 'test' }))
        .then(environment => environment.sys.id);

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
});

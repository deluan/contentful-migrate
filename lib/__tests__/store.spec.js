const contentful = require('contentful-management');
const dateformat = require('dateformat');
const expect = require('expect.js');

const { initSpace } = require('../store');

const accessToken = process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
const client = contentful.createClient({ accessToken });
const defaultLocale = 'en-CA';
const testSpaceName = `test-${dateformat(new Date(), 'UTC:yyyymmddHHMMss')}`;
let spaceId;

// using function because arrow functions can't set timeout in mocha... what?
function createTestSpace() {
  this.timeout(10000);
  return client.createSpace({ name: testSpaceName, defaultLocale })
    .then((space) => {
      spaceId = space.sys.id;
      return spaceId;
    });
}

// using function because arrow functions can't set timeout in mocha... what?
function deleteTestSpace() {
  this.timeout(10000);
  return spaceId && client.getSpace(spaceId).then(space => space.delete());
}

describe('Store', () => {
  before(createTestSpace);

  after(deleteTestSpace);

  describe('initSpace', () => {
    it('should create the migration content model in space @integration', async () => {
      await initSpace(accessToken, spaceId);
      // TODO: space.getContentTypes is going to be deprecated, should do a getEnvironment
      // before getContentTypes. My organization doesn't support environments yet :(
      const contentTypes = await client.getSpace(spaceId)
        .then(space => space.getContentTypes());
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

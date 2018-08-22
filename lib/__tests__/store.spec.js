const expect = require('expect.js');
const { ContentfulStore } = require('../store');

const set = JSON.parse(`
{
  "store": {
    "spaceId": "9spkj5fprncl",
    "contentTypeID": "deluan",
    "environmentId": "master",
    "accessToken": "CFPAT-30978164279d01bfba630a722238dcefe0905306b5aa651e7a951878576a2114",
    "dryRun": false,
    "client": {

    },
    "queryParams": {
      "content_type": "migration",
      "limit": 1000,
      "fields.contentTypeId": "deluan"
    },
    "locale": "en-US"
  },
  "migrations": [
    {
      "title": "20180822174241-test_111.js",
      "description": "This is a test",
      "timestamp": 1534959835497
    },
    {
      "title": "20180822174242-test_222.js",
      "description": "This is a another test",
      "timestamp": 1534959835497
    }
  ],
  "map": {
    "20180822174241-test_111.js": {
      "title": "20180822174241-test_111.js",
      "description": "This is a test",
      "timestamp": 1534959835497
    },
    "20180822174242-test_222.js": {
      "title": "20180822174242-test_222.js",
      "description": "This is a another test",
      "timestamp": 1534959835497
    }
  },
  "lastRun": "20180822174241-test_222.js"
}`);

describe('ContentfulStore', () => {
  const store = new ContentfulStore({
    accessToken: 'token',
    spaceId: 'space-id',
    contentType: 'test',
    locale: 'en-US'
  });

  describe('isSetEmpty', () => {
    it('should return false whem set is not empty', () => {
      expect(store.isSetEmpty(set)).to.be(false);
    });

    it('should return true whem set is empty', () => {
      const emptySet = {
        ...set,
        migrations: []
      };

      expect(store.isSetEmpty(emptySet)).to.be(true);
    });
  });

  describe('createStateFrom', () => {
    describe('with a fully applied set', () => {
      const state = store.createStateFrom(set);
      it('should format the state as a Contentful object', () => {
        expect(state).to.have.property('en-US');
      });

      it('should include lastRun info', () => {
        expect(state['en-US']).to.have.property('lastRun');
        expect(state['en-US']['lastRun']).to.be('20180822174241-test_222.js');
      });

      it('should include all applied migrations', () => {
        expect(state['en-US']['migrations']).to.have.length(2);
      });
    });

    describe('with a set with pending migrations', () => {
      const setWithPendingMigrations = {
        ...set,
        migrations: [
          {
            'title': '20180822174241-test_111.js',
            'description': 'This is a test',
            'timestamp': 1534959835497
          },
          {
            'title': '20180822174242-test_222.js',
            'description': 'This is a another test',
            'timestamp': null
          }
        ]
      };
      const state = store.createStateFrom(setWithPendingMigrations);

      it('should filter out pending migrations from set', () => {
        expect(state['en-US']['migrations']).to.have.length(1);
      });
    });
  });
});

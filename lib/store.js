const contentful = require('contentful-management')
const reduce = require('lodash.reduce')
const run = require('./run')

let cachedState

const queryParams = {
  content_type: 'migration',
  limit: 1000
}

let defaultSpaceLocale

const getDefaultLocale = async (accessToken, spaceId, environmentId) => {
  const client = contentful.createClient({ accessToken })
  const loc = await client.getSpace(spaceId)
    .then(space => space.getEnvironment(environmentId))
    .then(space => space.getLocales())
    .then(response => response.items.find(l => l.default))
  return loc.code
}

const initSpace = (accessToken, spaceId, environmentId) => {
  const migrationFunction = (migration) => {
    const contentType = migration.createContentType('migration')
      .name('Migration')
      .displayField('contentTypeId')
      .description('Meta data to store the state of content model through migrations')

    contentType.createField('state')
      .name('Migration State')
      .type('Object')
      .required(true)

    contentType.createField('contentTypeId')
      .name('Content Type ID')
      .type('Symbol')
      .required(true)
      .validations([{ unique: true }])
  }
  const args = {
    spaceId,
    environmentId: environmentId || 'master',
    accessToken,
    dryRun: false,
    migrationFunction,
    next: () => {
    }
  }
  return run(args)
}

const initializeStoreStates = async (accessToken, spaceId, environmentId) => {
  if (typeof cachedState !== 'undefined') {
    return cachedState
  }

  const client = contentful.createClient({ accessToken })
  cachedState = await client.getSpace(spaceId)
    .then(space => space.getEnvironment(environmentId))
    .then(space => space.getEntries(queryParams))
    .then(entries => reduce(entries.items, (acc, entry) => {
      const contentType = entry.fields.contentTypeId[defaultSpaceLocale]
      acc[contentType] = entry.fields.state[defaultSpaceLocale]
      return acc
    }, {}))
  return cachedState
}

class ContentfulStore {
  constructor ({
    spaceId, environmentId, contentType, accessToken, dryRun, locale
  }) {
    this.spaceId = spaceId
    this.contentTypeID = contentType
    this.environmentId = environmentId
    this.accessToken = accessToken
    this.dryRun = dryRun
    this.client = contentful.createClient({ accessToken })
    this.queryParams = Object.assign({}, queryParams, { 'fields.contentTypeId': this.contentTypeID })
    this.locale = locale || defaultSpaceLocale
    return this
  }

  createStateFrom (set) {
    const migrations = set.migrations.filter(m => m.timestamp)
    return {
      [this.locale]: {
        lastRun: set.lastRun,
        migrations: migrations
      }
    }
  }

  isSetEmpty (set) {
    return set.migrations.filter(m => m.timestamp).length === 0
  }

  deleteState () {
    return this.client.getSpace(this.spaceId)
      .then(space => space.getEnvironment(this.environmentId))
      .then((space) => space.getEntry(this.contentTypeID))
      .then((entry) => entry.delete())
  }

  writeState (set) {
    if (this.isSetEmpty(set)) {
      return this.deleteState()
    }
    return this.client.getSpace(this.spaceId)
      .then(space => space.getEnvironment(this.environmentId))
      .then(space => space.getEntries(this.queryParams))
      .then((entries) => {
        if (entries.total === 0) {
          return this.client.getSpace(this.spaceId)
            .then(space => space.getEnvironment(this.environmentId))
            .then(space => space.createEntryWithId('migration', this.contentTypeID, {
              fields: {
                contentTypeId: { [this.locale]: this.contentTypeID },
                state: this.createStateFrom(set)
              }
            }))
        }
        const entry = entries.items[0]
        entry.fields.state = this.createStateFrom(set)
        return entry.update()
      })
  }

  save (set, fn) {
    if (this.dryRun) {
      return fn()
    }
    return this.writeState(set)
      .then(() => fn())
      .catch(error => fn(error))
  }

  load (fn) {
    const state = cachedState[this.contentTypeID]
    if (typeof state !== 'undefined') {
      return fn(null, state)
    }
    return fn(null, {})
  }

  init () {
    return initSpace(this.accessToken, this.spaceId, this.environmentId)
  }
}

const createStoreFactory = async ({
  accessToken, spaceId, environmentId, dryRun
}) => {
  defaultSpaceLocale = defaultSpaceLocale || await getDefaultLocale(accessToken, spaceId, environmentId)
  await initializeStoreStates(accessToken, spaceId, environmentId)

  return {
    newStore: contentType =>
      new ContentfulStore({
        accessToken, spaceId, environmentId, contentType, dryRun
      })
  }
}

module.exports = { initSpace, createStoreFactory, ContentfulStore }

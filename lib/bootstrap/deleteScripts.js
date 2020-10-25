const log = require('migrate/lib/log')
const logError = require('migrate/lib/log').error
const rimraf = require('rimraf')
const path = require('path')

const deleteScripts = (migrationsDirectory, contentTypes) => {
  if (contentTypes.length > 0) {
    const promises = contentTypes.map((contentType) => {
      return new Promise((resolve, reject) => {
        const contentTypeDirectory = path.join(migrationsDirectory, contentType)
        return rimraf(contentTypeDirectory, (error) => {
          if (error) {
            reject(logError(`🚨   Failed to delete ${contentTypeDirectory} folder`, error))
          }
          resolve(log(`${contentTypeDirectory} folder`, 'deleted'))
        })
      })
    })
    return Promise.all(promises)
  }
  return new Promise((resolve, reject) => {
    return rimraf(migrationsDirectory, (error) => {
      if (error) {
        reject(logError('🚨   Failed to delete migrations folder', error))
      }
      resolve(log('Migrations folder', 'deleted'))
    })
  })
}

module.exports = deleteScripts

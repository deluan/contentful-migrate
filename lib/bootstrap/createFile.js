const path = require('path')
const fs = require('fs')
const log = require('migrate/lib/log')
const logError = require('migrate/lib/log').error
const mkdirp = require('mkdirp')
const dateformat = require('dateformat')

const camelToDash = string => string.replace(/([A-Z])/g, char => `-${char.toLowerCase()}`)

const createFile = (contentTypeId, fileContent, migrationsDirectory) => {
  const directory = path.join(migrationsDirectory, contentTypeId)
  return new Promise((resolve, reject) => {
    // Ensure migrations directory exists
    mkdirp(directory, (makeDirectoryError) => {
      if (makeDirectoryError) {
        reject(logError(`🚨  Failed to create ${directory}`, makeDirectoryError))
      }

      // Fix up file path
      const date = dateformat(new Date(), 'UTC:yyyymmddHHMMss')
      const fileName = `${date}-create-${camelToDash(contentTypeId)}.js`
      const filePath = path.join(process.cwd(), directory, fileName)

      // Write the template file
      return fs.writeFile(filePath, fileContent, (writeFileError) => {
        if (writeFileError) {
          reject(logError(`🚨  Failed to create ${directory}/${fileName}`, writeFileError))
        }
        log('Created', `${directory}/${fileName}`)
        resolve({ contentTypeId, fileName })
      })
    })
  })
}

module.exports = createFile

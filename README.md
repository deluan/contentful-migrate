# Contentful Migrate Tool

[![npm](https://img.shields.io/npm/v/contentful-migrate.svg)](https://www.npmjs.com/package/contentful-migrate)
[![Build Status](https://travis-ci.org/deluan/contentful-migrate.svg?branch=master)](https://travis-ci.org/deluan/contentful-migrate)

Manage your Contentful schema by creating incremental scripted changes. This project is based on the ideas exposed 
in [Contentful's CMS as Code article](https://www.contentful.com/r/knowledgebase/cms-as-code/) 

Scripts are written using Contentful's [migration-cli](https://github.com/contentful/migration-cli) syntax. Ex:

```javascript 1.6
  module.exports.description = 'Creates Post model';
  
  module.exports.up = (migration) => {
    const post = migration.createContentType('post')
      .name('Post')
      .displayField('title')
      .description('Post model');
  
    post.createField('title')
      .name('Title')
      .type('Symbol')
      .required(true)
      .localized(false);
  };
  
  module.exports.down = (migration) => {
    migration.deleteContentType('post');
  };
```

This tool is designed to keep track of changes of content types individually. It keeps the 
scripts in a `migrations` folder in your project. This folder must contain one subfolder for each 
content type. Ex:

```
your-project
├── README.md
├── migrations
│   ├── PageTemplate
│   │   └── 1513743198536-create-page-template.js
│   └── Post
│       ├── 1513695986378-create-post.js
│       └── 1513716408272-add-date-field.js
├── package.json
.
.
.

``` 

For more information on schema migrations technique and practice, see:
* [Evolutionary Database Design](https://martinfowler.com/articles/evodb.html#AllDatabaseChangesAreMigrations)
* [Schema migration](https://en.wikipedia.org/wiki/Schema_migration)

## Usage

Most of the available commands need a 
[personal access token](https://www.contentful.com/developers/docs/references/authentication/) 
for accessing the CMA (Contentful Management API). You can pass the token using the `--access-token`
option or setting an environment variable called `CONTENTFUL_MANAGEMENT_ACCESS_TOKEN`

### init

Creates the content type 'Migration' into the designated contentful space. This will be
used to keep track of the current state of each managed content type.

```
  Usage: ctf-migrate init [options]
  
  Options:
  
    -t, --access-token [access-token]  CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty
    -s, --space-id [space-id]          space id to use
```

If the target space already has been init'd before, it will throw an error:

`Content type with id "migration" already exists.`

### create

Creates an empty time stamped file in the content-type's migrations folder.

```
  Usage: ctf-migrate create [options] <name>
  
  Options:
  
    -c, --content-type <content-type>  content type name
```

Example: executing the command `ctf-migrate create -c Post create-post-model` will create 
a file named `./migrations/Post/1513695986378-create-post.js` (the timestamp will vary)

### list

Lists all migrations for a given content-type, also indicating whether it was already 
applied and when.

```
  Usage: ctf-migrate list [options]
  
  Options:
  
    -t, --access-token [access-token]  CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty
    -c, --content-type [content-type]  content type name
    -s, --space-id [space-id]          space id to use
```

Exemple: 
```
$ ctf-migrate list -c Post -s i2ztmmsocxul
  [2017-12-19 22:12:58] 1513695986378-create-post.js : Creates Post model
  [pending] 1513716408272-add-title-field.js : Adds title field
```
In this example, the first script (`create-post.js`) has already been applied but the 
second one (`add-title-field.js`) has not 

### up

Migrates up to a specific version or all pending scripts if a name is not informed. This will apply pending scripts for 
the specified content-type into the specified space. 

```
  Usage: ctf-migrate up [options] [name]

  Options:

    -t, --access-token [access-token]  CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty
    -c, --content-type [content-type]  content type name
    -s, --space-id [space-id]          space id to use
    -d, --dry-run                      only shows the plan, don't write anything to contentful. defaults to false
```

### down

Migrates down to a specific version or just the last one if name is not informed. This will roll back applied scripts 
for the specified content-type from the specified space. 

```
  Usage: ctf-migrate down [options] [name]

  Options:

    -t, --access-token [access-token]  CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty
    -c, --content-type [content-type]  content type name
    -s, --space-id [space-id]          space id to use
    -d, --dry-run                      only shows the plan, don't write anything to contentful. defaults to false
```

## Writing Migrations

For more information on how to write migrations, see 
[Contentful migrations documentation](https://github.com/contentful/migration-cli#reference-documentation)

This tool is based on [node-migrate](https://github.com/tj/node-migrate). For more 
information on how to run migrations, see [Running migrations](https://github.com/tj/node-migrate#running-migrations)


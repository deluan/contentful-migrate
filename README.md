# Contentful Migrate Tool

[![npm](https://img.shields.io/npm/v/contentful-migrate.svg)](https://www.npmjs.com/package/contentful-migrate)
[![contentful-migration version](https://img.shields.io/npm/dependency-version/contentful-migrate/contentful-migration)](https://www.npmjs.com/package/contentful-migration)
[![Build Status](https://github.com/deluan/contentful-migrate/workflows/CI/badge.svg)](https://github.com/deluan/contentful-migrate/actions)
[![Downloads](https://img.shields.io/npm/dm/contentful-migrate)](https://www.npmjs.com/package/contentful-migrate)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdeluan%2Fcontentful-migrate.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdeluan%2Fcontentful-migrate?ref=badge_shield)

Manage your Contentful schema by creating incremental scripted changes. This project is based on the ideas exposed
in [Contentful's CMS as Code article](https://www.contentful.com/r/knowledgebase/cms-as-code/)

Scripts are written using [Contentful's migration tool](https://github.com/contentful/contentful-migration) syntax. Ex:

```javascript
module.exports.description = "Create Post model";

module.exports.up = migration => {
  const post = migration
    .createContentType("post")
    .name("Post")
    .displayField("title")
    .description("Post model");

  post
    .createField("title")
    .name("Title")
    .type("Symbol")
    .required(true)
    .localized(false);
};

module.exports.down = migration => {
  migration.deleteContentType("post");
};
```

This command line tool is designed to keep track of changes of content types individually. It keeps the
scripts in a `migrations` folder in your project. This folder must contain one subfolder for each
content type. Ex:

```
your-project
├── README.md
├── migrations
│   ├── banner
│   │   └── 1513743198536-create-banner.js
│   └── post
│       ├── 1513695986378-create-post.js
│       └── 1513716408272-add-date-field.js
├── package.json
.
.
.

```

For more information on schema migrations technique and practice, see:

- [Evolutionary Database Design](https://martinfowler.com/articles/evodb.html)
- [Schema migration](https://en.wikipedia.org/wiki/Schema_migration)

## Installation

```sh
npm install -g contentful-migrate
```

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
    -e, --environment-id [env-id]      id of the environment within the space (default 'master')
```

If the target space already has been init'd before, it will throw an error:

`Content type with id "migration" already exists.`

### bootstrap

Create your migration files for content models already in your space. It gives you the option to squash any previous migration state.
Note: It will delete any existing migration scripts and create a consolidated one for each specified content type.

```
  Usage: ctf-migrate bootstrap [options]

  Options:

    -t, --access-token [access-token]  CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty
    -s, --space-id [space-id]          space id to use
    -e, --environment-id [env-id]      id of the environment within the space (default 'master')
    -c, --content-type [content-type]  one or more content type to bootstrap with choice to overwrite migration state
    -a, --all                          apply bootstrap to all with choice to overwrite migration state
```

Example: executing the command `ctf-migrate bootstrap -c post -s <space-id>` will create a file where the `up` command will generate the exact snapshot of the `Post` content model

### create

Creates an empty time stamped file in the content-type's migrations folder.

```
  Usage: ctf-migrate create <name> [options]

  Options:

    -c, --content-type <content-type>  content type name
```

Example: executing the command `ctf-migrate create create-post-model -c post` will create
a file named `./migrations/post/1513695986378-create-post.js` (the timestamp will vary)

### list

Lists all migrations for the given content-types, also indicating whether they were already
applied and when.

```
  Usage: ctf-migrate list [options]

  Options:

    -t, --access-token [access-token]  CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty
    -s, --space-id [space-id]          space id to use
    -e, --environment-id [env-id]      id of the environment within the space (default 'master')
    -c, --content-type [content-type]  one or more content type names to list
    -a, --all                          lists migrations for all content types
```

Example:

```bash
$ ctf-migrate list -s i2ztmmsocxul -c post banner
Listing post
  [2017-12-19 22:12:58] 1513695986378-create-post.js : Create Post model
  [pending] 1513716408272-add-title-field.js : Adds title field
Listing banner
  [2018-01-08 15:01:45] 20180103165614-create-banner.js : Create Banner model
  [2018-01-22 11:01:33] 20180111172942-add-subtitle-field.js: Add Subtitle field
```

For the `post` model in this example, the first script (`create-post.js`) has already been applied but the
second one (`add-title-field.js`) has not. For the `banner` model, all scripts have been applied.

### up

Migrates up to a specific version or all pending scripts if a filename is not informed. This will apply pending scripts for
the specified content-type into the specified space.

```
  Usage: ctf-migrate up [filename] [options]

  Options:

    -t, --access-token [access-token]  CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty
    -s, --space-id [space-id]          space id to use
    -e, --environment-id [env-id]      id of the environment within the space (default 'master')
    -c, --content-type [content-type]  one or more content type names to process
    -a, --all                          processes migrations for all content types
    -d, --dry-run                      only shows the plan, don't write anything to contentful. defaults to false
```

### down

> **ATTENTION**: As noted in the [CMS as Code article](https://www.contentful.com/r/knowledgebase/cms-as-code/#how-to-get-started),
"in real-world situations there is often no real way to down migrate content without resorting to backups". Even though
we agree with that assertion, we still think there is value in having a `down` function to make it easier to develop
and debug the `up` migration scripts (when you're working on a dev/test space), as it makes it easy to revert your
changes and try again, without resorting to any manual intervention.\*

Migrates down to a specific version or just the last one if filename is not informed. This will roll back applied scripts
for the specified content-type from the specified space.

```
  Usage: ctf-migrate down [filename] [options]

  Options:

    -t, --access-token [access-token]  CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty
    -s, --space-id [space-id]          space id to use
    -e, --environment-id [env-id]      id of the environment within the space (default 'master')
    -c, --content-type [content-type]  content type name
    -d, --dry-run                      only shows the plan, don't write anything to contentful. defaults to false
```

## Writing Migrations

For more information on how to write migrations, see
[Contentful migrations documentation](https://github.com/contentful/contentful-migration#documentation--references)

This tool is based on [node-migrate](https://github.com/tj/node-migrate). For more
information on how to run migrations, see [Running migrations](https://github.com/tj/node-migrate#running-migrations)


## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdeluan%2Fcontentful-migrate.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdeluan%2Fcontentful-migrate?ref=badge_large)
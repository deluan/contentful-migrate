# Change Log
All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](http://semver.org/).

## 2018-02-21 - [0.2.1 - current version]

- 0.2.1 - ([aeaacc8](https://github.com/deluan/contentful-migrate/commit/aeaacc8ac586b14b67b35e9c5830b77dadddecb3)) - 0.2.0 (@deluan)
- 0.2.0 - ([5](https://github.com/deluan/contentful-migrate/pull/5)) - feat: allow multiple content-types to be passed to `list` and `up` (@deluan)

## 2018-02-20

- 0.1.18 - ([772275d](https://github.com/deluan/contentful-migrate/commit/772275d832ca213f95418ffb314aa3fd17a6e3a0)) - fix(cli): make `space-id` required (@deluan)
- 0.1.17 - ([4bb1250](https://github.com/deluan/contentful-migrate/commit/4bb12505d52b70d38470a406a680c6a2e0380098)) - docs(readme): add link to cms-as-code article (@deluan)
- 0.1.16 - ([15a7e1c](https://github.com/deluan/contentful-migrate/commit/15a7e1cb05ee836e5c00c6f514b3f02e820a5644)) - 0.1.1 (@deluan)
- 0.1.15 - ([8620f66](https://github.com/deluan/contentful-migrate/commit/8620f666b7e9399619f7f1d93cfe577dfe7a7e6a)) - fix(store): increased limit to 1000 for content types (@deluan)
- 0.1.14 - ([6ff57e6](https://github.com/deluan/contentful-migrate/commit/6ff57e62146d3882c25c088b8c501a5813d03bb1)) - refactor(store): refactored handlers params  Also made `dryRun` option/variable consistent throughout the codebase (@deluan)
- 0.1.13 - ([afc7b10](https://github.com/deluan/contentful-migrate/commit/afc7b107a796282b99da583ff7f0fb7608ea07bc)) - refactor(store): use lodash.reduce function to get state (@deluan)
- 0.1.12 - ([6](https://github.com/deluan/contentful-migrate/pull/6)) - fix(bootstrap): increased limit to 1000 for content types (@boblington)
- 0.1.11 - ([b9a2aa6](https://github.com/deluan/contentful-migrate/commit/b9a2aa6c8e4c06a47a62ba81c326a821f80025a4)) - fix(bootstrap): increased limit to 1000 for content types  need to add pagination to remove hard limit (@boblington)
- 0.1.10 - ([2](https://github.com/deluan/contentful-migrate/pull/2)) - refactor(cli): uses yargs instead of commander (@deluan)
- 0.1.9 - ([9e66de8](https://github.com/deluan/contentful-migrate/commit/9e66de89ff571519f38c1eb97d503228b5937cb3)) - docs(readme): make usage texts more consistent  Put options in the end of all commands, as `up` requires it (@deluan)
- 0.1.8 - ([6302b2a](https://github.com/deluan/contentful-migrate/commit/6302b2adcada5e77477b3be580b32769b4ea48f2)) - fix(up): don't apply up migrations in parallel  It makes the logs confusing. Maybe we can make this a command line option, once we refactor the log messages  Also this commit fix an issue with `-c` option, when it was passed more then one content-type (@deluan)

## 2018-02-19

- 0.1.7 - ([645558c](https://github.com/deluan/contentful-migrate/commit/645558c37883c0b396f6e7455441c75ca0fc1437)) - fix(cli): don't show CMA token in help (@deluan)

## 2018-02-18

- 0.1.6 - ([5347433](https://github.com/deluan/contentful-migrate/commit/53474337011026d6f75154c165ab2072cdbbee39)) - fix(cli): make at least 1 argument required for -c option (@deluan)
- 0.1.5 - ([3043d15](https://github.com/deluan/contentful-migrate/commit/3043d1586b2382928906aed9d7cd83b1d74f04a1)) - refactor(load): fetch all migration metadata in one API call (@deluan)

## 2018-02-17

- 0.1.4 - ([0c2de10](https://github.com/deluan/contentful-migrate/commit/0c2de10d85c24f35e39fb83a7de62149d3b105b1)) - feat: up and list commands accepts multiple content types  You can now also specify --all for these commands to process all content types found in the migration folder (@deluan)
- 0.1.3 - ([b0ada7b](https://github.com/deluan/contentful-migrate/commit/b0ada7bc716308e3a1dc1c9a615841d71871d102)) - refactor(cli): uses yargs instead of commander (@deluan)

## 2018-02-16

- 0.1.2 - ([51bcc87](https://github.com/deluan/contentful-migrate/commit/51bcc879fd2b321494825c77cc5d77e5d22badb4)) - docs(readme): add package version badge (@deluan)

## 2018-02-15

- 0.1.1 - ([932e57a](https://github.com/deluan/contentful-migrate/commit/932e57adf0d893695a45dbd7c23d0b23c44162a4)) - Initial import (@deluan)

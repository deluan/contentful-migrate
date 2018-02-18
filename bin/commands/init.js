#!/usr/bin/env node
// vim: set ft=javascript:

const { ContentfulStore } = require('../../lib/store');

exports.command = 'init';

exports.desc =
  'Prepares the specified space to allow managed migration scripts.\nThe "Migration" content-type will be created in your contentful space';

exports.builder = (yargs) => {
  yargs
    .option('access-token', {
      alias: 't',
      describe:
        'CMA token, defaults to your environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN if empty',
      demandOption: true,
      default: process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN
    })
    .option('space-id', {
      alias: 's',
      describe: 'space id to use',
      demandOption: true
    });
};

exports.handler = (argv) => {
  const { spaceId, accessToken } = argv;

  const store = new ContentfulStore({ spaceId, accessToken, dryrun: false });
  store.init();
};

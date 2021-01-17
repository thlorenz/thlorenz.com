#!/usr/bin/env node

'use strict'

var Handlebars = require('handlebars'),
  metalsmith = require('metalsmith'),
  collections = require('metalsmith-collections'),
  excerpts = require('metalsmith-excerpts'),
  metallic = require('metalsmith-metallic'),
  markdown = require('metalsmith-markdown'),
  permalinks = require('metalsmith-permalinks'),
  templates = require('metalsmith-templates'),
  lunr = require('metalsmith-lunr')

function sortByDate(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1

  const date1 = Date(a.date)
  const date2 = Date(b.date)
  if (date2 > date1) return -1
  if (date1 > date2) return 1
  return 0
}

metalsmith(__dirname)
  .metadata({
    partials: {
      _sidebar: '_sidebar',
      _head_common: '_head_common',
    },
  })
  .use(
    collections({
      posts: {
        pattern: 'blog/*.md',
        sortBy: sortByDate,
        reverse: true,
      },
    })
  )
  .use(metallic())
  .use(markdown())
  .use(excerpts())
  .use(permalinks({ pattern: 'blog/:title' }))
  .use(templates({ engine: 'handlebars' }))
  .use(lunr({ fields: { tags: 10, contents: 1 } }))
  .build(onbuilt)

function onbuilt(err) {
  if (err) return console.error(err)
}

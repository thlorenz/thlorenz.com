'use strict';

var Handlebars  = require('handlebars')
  , metalsmith  = require('metalsmith')
  , collections = require('metalsmith-collections')
  , excerpts    = require('metalsmith-excerpts')
  , metallic    = require('metalsmith-metallic')
  , markdown    = require('metalsmith-markdown')
  , permalinks  = require('metalsmith-permalinks')
  , templates   = require('metalsmith-templates')
  , lunr        = require('metalsmith-lunr')

metalsmith(__dirname)
  .metadata({ partials: {
      _sidebar: '_sidebar'
    , _head_common: '_head_common' }
  })
  .use(collections({
      posts: {
          pattern : 'blog/*.md'
        , sortBy  : 'date'
        , reverse : true
      }
  }))
  .use(metallic())
  .use(markdown())
  .use(excerpts())
  .use(permalinks({ pattern: 'blog/:title' }))
  .use(templates({ engine: 'handlebars' }))
  .use(lunr({ fields: { tags: 10, contents: 1 } }))
  .build(onbuilt);

function onbuilt(err) {
  if (err) return console.error(err);
}

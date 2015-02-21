---
title:  The nodejs local module path trick
date:   Wed Dec 18 2013 22:00:52
tags:   nodejs 
lunr:   true
template: post.html
---

Sometimes you have a module installed locally that happens to have the same name as a core module. 
As an example you may have a module called `util`.

Now if you `var util = require('util')` you actually get the node core `util` module, not what you wanted right?

So then you may think `var util = require('./node_modules/util')` maybe the end all be all.

**Not so fast scotty!** Cuz if someone installs your library as a dependency and runs [`npm dedupe`](https://npmjs.org/doc/cli/npm-dedupe.html)
then your `util` module may get moved up one or more directories, well and then it's not where you are trying to
find it anymore.

There is however a nice little *trick* [I found today in one of @defunctzombie's
modules](https://github.com/defunctzombie/commonjs-assert/blob/f8971d04cfc6a54e2a72ae45f3dd00f62fd9282d/assert.js#L25-L28)

Asking for the `util` module via `var util = require('util/')` (trailing slash is important) will make nodejs load it
from your local `node_modules`, but also find it if it was moved due to `npm dedupe`.

And that's all there is too it.

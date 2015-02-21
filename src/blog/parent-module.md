---
title:  How to detect if a nodejs module is run as a script
date:   Thu Feb 21 2013 08:53:31
tags:   nodejs replpad javascript 
lunr:   true
template: post.html
---

## Quick Answer

### First option, recommended by the [module docs](http://nodejs.org/api/modules.html#modules_accessing_the_main_module)

```js
var runningAsScript = require.main === module;
```

### Second option, a bit shorter

```js
var runningAsScript = !module.parent;
```

If you want to find out how the second option works, read on.

## The NodeJS Module Parameter 

Every nodejs module gets a `module` variable injected when it is evaluated. So `module` is not global, but instead a
parameter that is passed into a self invoking function that the module is wrapped with.

It looks like this: 

```js
(function (exports, require, module, __filename, __dirname) {
  // module code here
})();
```

Quoting from the [module documentation](http://nodejs.org/api/modules.html#modules_module_parent), the parent of the
module is:
    
> The module that required this one.

So it follows that a module will have no parent if it is executed as a script.

## A Simple Example

We are going to use [replpad](https://github.com/thlorenz/replpad) to load
some code and inscpect things. You can follow along by cloning this blog `git clone
git://github.com/thlorenz/thlorenz.com-blog.git`. 

Inside the `parent-module/snippets` folder you will find the sample files I use below.

First we create the module that will be the parent `foo.js`.

{{ snippet: foo.js }}

The child, that is required by it, `bar.js` looks like this:

{{ snippet: bar.js }}

In order to play around with them, lets fire up replpad:

```sh
➜  parent-module  replpad .

Loading replpad config from: /Users/thlorenz/.config/replpad/config.js

Started watching: snippets/bar.js
Started watching: snippets/foo.js
Started watching: snippets/script.js
Watching [3 files]

replpad v0.5.0

node v0.8.16 | MacBook-Air.local | 4 cpus | darwin platform | v8 v3.11.10.25 | uv v0.8

plugins: vim | matchtoken

If in doubt, enter .help

pad > 
```

Now we can open `foo.js` in an editor and save it in order to have replpad evaluate it. At this point we have access to
bar's module since bar exports it.

```sh
pad > bar.module
{ id: '[..]/thlorenz.com-blog/parent-module/snippets/bar.js',
  exports: { module: [Circular] },
  parent: 
   { id: '[..]/thlorenz.com-blog/parent-module/snippets/foo.js',
     exports: {},
     parent: undefined,
     filename: '[..]/thlorenz.com-blog/parent-module/snippets/foo.js',
     loaded: false,
     children: [ [Circular] ],
     paths: 
      [ [ .. ],
        /Users/node_modules',
        '/node_modules' ] },
  filename: '[..]/thlorenz.com-blog/parent-module/snippets/bar.js',
  loaded: true,
  children: [],
  paths: 
   [ [ .. ], 
     '/Users/node_modules',
     '/node_modules' ] }
pad > 
```

This prints all the module's properties (paths are shortened). As you can see bar's parent is foo, since that is the
module that required it. However bar has not required any module itself and therefore has no children. 

Note that foo's children are output as `[Circular]` which makes sense.

We can also print foo's module information, using the fact that foo's module is actually bar's parent.

```sh
pad > bar.module.parent
{ id: '[..]/thlorenz.com-blog/parent-module/snippets/foo.js',
  exports: {},
  parent: undefined,
  filename: '[..]/thlorenz.com-blog/parent-module/snippets/foo.js',
  loaded: false,
  children: 
   [ { id: '[..]/thlorenz.com-blog/parent-module/snippets/bar.js',
       exports: { module: [Circular] },
       parent: [Circular],
       filename: '[..]/thlorenz.com-blog/parent-module/snippets/bar.js',
       loaded: true,
       children: [],
       paths: 
        [ [ .. ],
          '/Users/node_modules',
          '/node_modules' ] } ],
  paths: 
    [ [ .. ],
     '/Users/node_modules',
     '/node_modules' ] }
```

Now we can see, that bar is indeed the only child of foo and that foo itself has no parent.

Another interesting thing to realize is, that `bar` itself is actually the same object as the exports of its module:

```sh
pad > bar === bar.module.exports
true
```

## Running a module as a script

As a final proof of concept lets run a
script from the command line and make sure that it really has no parent. I created one in the `snippets` folder:

{{ snippet: script.js }}

Here is the output when we run it:

```sh
➜  parent-module  node snippets/script.js 
{ id: '.',
  exports: { hello: 'world' },
  parent: null,
  filename: '[..]/thlorenz.com-blog/parent-module/snippets/script.js',
  loaded: false,
  children: [],
  paths: 
   [ [ .. ]. 
     '/Users/node_modules',
     '/node_modules' ] }
```

As we can see, its `parent` is `null` since no other module required it.

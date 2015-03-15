---
title:  browserify v2 adds source maps
date:   Sunday March 31st 2013 21:49:41
tags:   nodejs browserify javascript sourcemaps
lunr:   true
template: post.html
---

I recently helped to add source map support to [browserify](https://github.com/substack/node-browserify) version 2 and will
outline in this post, what source maps are, how to use them with browserify and how the support was added.

## What is browserify

In order for what follows to make sense, you should have a basic understanding of what browserify is and what it does. 

In one sentence it will bundle your modules that are written using CommonJS style `require`s into one file that can
execute in the browser. Read more [here](https://github.com/substack/node-browserify/blob/master/readme.markdown).

## How do I get source maps to work with browserify, tell me quick!

This section is for the impatient and will just outline what you have to do in order to get source maps into
your browserified bundle.

### From the command line

Build your bundle as before, except include the `--debug` flag, i.e.:

`browserify --entry main.js --outfile bundle.js --debug`

### Inside your build script

Build your bundle as before, except pass `{ debug: true }` to the bundle function i.e.:

```js
browserify()
  .require(require.resolve('./main.js'), { entry: true })
  .bundle({ debug: true })
  .pipe(fs.createWriteStream('./bundle.js'));
```

### Enabling source maps in the browser

In chrome do the following to get source map support:

1. open dev tools `Cmd-Alt-J`
2. Click on the cog icon in the bottom right corner
3. Select the 'General` tab and check 'Enable source maps'

Now you can refresh your browser and should see modules that were included in the bundle as separate entries in the
'Sources' tab. You can directly debug these files and they also show up in your stacktraces and log statements.

## Itching to try it right now?

[Here is a live example](http://thlorenz.github.com/WebGLCraft/) of debugging coffee script in the browser:

![minecraft-shot](https://raw.github.com/thlorenz/WebGLCraft/master/assets/devtools-breakpoint.png)

Another example allows [debugging ES6 in the browser](http://thlorenz.github.com/es6ify/) (although that still has serious issues).

## How does it all work?

At this point you know everything to get going with source maps via browserify. The remaining post will go into more
details of source maps and how they were added to browserify.

### What are source maps

In order to not litter the net with needless repetition I'll send you right over to this [very thorough html5 rocks
article on source maps](http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/). Understanding the ins and
outs of the [Base64 VLQ](http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-base64vlq) section is not
required ;)

If you like to read proposals instead, I strongly recommend
[this](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit).

One important thing to note is that the html5 rocks article omits one source map detail that became crucial for
supporting source maps in browserify. Here is an example from the html5 rocks post:

```js
{
  version    :  3,
  file       :  "out.js",
  sourceRoot :  "",
  sources    :  ["foo.js", "bar.js"],
  names      :  ["src", "maps", "are", "fun"],
  mappings   :  "AAgBC,SAAQ,CAAEA"
}
```

Here is an example of the proposed format from the just mentioned proposal:

```js
{
  version        :  3,
  file           :  “out.js”,
  sourceRoot     :  "",
  sources        :  ["foo.js", "bar.js"],
  sourcesContent :  [null, null],
  names          :  ["src", "maps", "are", "fun"],
  mappings       :  "AA,AB;;ABCDE;"
}
```

Do you see the minor difference? Yes, it shows a `sourcesContent` property. We'll come back to that in a minute.

In summary you should understand that source maps map generated lines and columns to the respective original lines and
columns, essentially allowing to map a character in a generated file to a character in the original file.

### The browserify bundle chain

One very important thing to mention at this point is that the bundle generation process used by browserify is entirely
stream based. This means that input data flows in, is transformed and flows back out. A good example is
[browser-pack](https://github.com/substack/browser-pack) which consumes a JSON stream of entries and produces the
bundle string.

The other important aspect is that James Halliday aka @substack is very keen on keeping the browserify API as simple as
possible as well as keeping the browserify core focused and small. So the challenge was to add source maps in a manner which
required the least changes to the existing API, kept most of the source map related logic out of the browserify itself, 
yet handled all or at least most of the use cases.

### The first attempt

Since at the time I wasn't aware of the meaning of the `sourcesContent` field, I came up with a
[solution](https://github.com/substack/browser-pack/pull/3) that required more changes to the browser-pack
implementation and the browserify API than @substack had expected. Especially supporting different scenarious would have
let to a [fairly bloated API](https://github.com/substack/node-browserify/issues/322#issuecomment-14784651)

Fortunately [Forbes Lindesay](https://github.com/forbeslindesay) pointed me to [information about the sourcesContent
field](https://trac.webkit.org/changeset/111389). What this basically meant is that **all** the information regarding a
source map could be included in it, **even the content of the original file**.

That changed everything!

### Stream all the things!

The ability to include the the content opens up lots of possibilities and has tremendous advantages over the first
approach.

Most importantly the API doesn't have to be able to supply any information at all, except if source maps are desired or not as it now
does with a simple `--debug` flag. 

There are two possibilities when bundling a file:

- a) the file already contains a source map (with all its information, including the original content), as would
  be the case if it was transpiled from another language
- b) the file contains no source map yet

If we encounter the first case, we need to decode the contained source map and offset it depending on where in the
bundle the content of the file will end up. If we encounter the second case, we need to generate a source map for the
file and offset it properly.

Finally we need to combine the offset source maps of all files into one source map, encode it and append it to the bundle.

In order to keep all this work out of the browser-pack module itself, I created
[combine-source-map](https://github.com/thlorenz/combine-source-map). 

It handles the whole process:

- finds and decodes source maps inside added files or generates them if none are found 
- returns the proper comment for the combined source map. 

In true modular fashion it relies on [convert-source-map](https://github.com/thlorenz/convert-source-map) and
[inline-source-map](https://github.com/thlorenz/inline-source-map) to get most of the work done. All browser-pack itself has to
do is keep track of the line numbers at which files are added to the bundle and pass them along to combine-source-map
when adding each file.

### It's just Strings

The other cool aspect of just streaming strings this is that all different user cases can be satisfied without
adding hooks or API features. The bundle itself contains the encoded source map along with **all** information.
Therefore, if a user wants to customize the source map and or [export it to a
file](https://github.com/substack/node-browserify/issues/339) he can do so. 

The necessary steps are as follows:

- generate the bundle with source map enabled
- before writing or serving it, rip out the contained source map
- decode the source map in order to transform it however you please
- attach whatever you want in place of the source map to the bundle

To simplify this I created another module, [mold-source-map](https://github.com/thlorenz/mold-source-map). It allows you
to add a simple **post** bundle transform to archieve what you need. 

To show all source files relative to a certain directory (by default it uses the full path), you just do the following:

```js
browserify()
  .require(require.resolve('./main.js'), { entry: true })
  .bundle({ debug: true })
  .pipe(require('mold-source-map').transformSourcesRelativeTo(jsRoot))
  .pipe(fs.createWriteStream(bundlePath));
```

More transforms will be added in the future, but you can use the most powerful transform to pretty much do anything with
the generated source map that I can imagine, even externalize it to an external map file as in the following example:

```js
  function mapFileUrlComment(sourcemap, cb) {
  // make source files appear under the following paths:
  // /js
  //    foo.js
  //    main.js
  // /js/wunder
  //    bar.js 

  sourcemap.sourceRoot('file://'); 
  sourcemap.mapSources(mold.mapPathRelativeTo(jsRoot));

  // write map file and return a sourceMappingUrl that points to it
  fs.writeFile(mapFilePath, sourcemap.toJSON(2), 'utf-8', function (err) {
    if (err) return console.error(err);
    cb('//@ sourceMappingURL=' + path.basename(mapFilePath));
  });
}

browserify()
  .require(require.resolve('./project/js/main.js'), { entry: true })
  .bundle({ debug: true })
  .pipe(require('mold-source-map').transform(mapFileUrlComment))
  .pipe(fs.createWriteStream(bundlePath));
```

## Wrapping up

I hope I was able to give the reader a good idea of what source maps are in general and how they fit with browserify. 

I also hope that I helped people realize how powerful the idea of passing information encoded in a string can be. In
this case it allows to keep modules that interact with browserify on either end of the pipeline totally decoupled from
browserify itself

As an example, the coffee script compiler has no notion of browserify, but simply instructing it to generate source
maps with inlined `sourcesContent` (see
[here](https://github.com/substack/coffeeify/blob/947329a5c9c81e86c432968efe696e0585627c6c/index.js#L6) or
[here](https://github.com/thlorenz/caching-coffeeify/blob/c52fb11aae6c39144759c11f8ff4bedc4aa6864a/index.js#L17)) is
enough to make this step compatible with the browserify pipeline.

Finally I hope that source maps are another good reason for you to **give browserify a try** if you haven't done so.

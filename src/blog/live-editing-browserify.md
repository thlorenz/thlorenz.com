---
title:  Live edit browserified code in chrome devtools
date:   Wed Jan 29 2014 21:43:37
tags:   browserify javascript chrome devtools 
lunr:   true
template: post.html
---

You may have noticed that [Remy Sharp never has to leave devtools], or have watched [addy osmani improving productivity with chrome dev tools].

If not, you should and while you are at it read [chrome-devtools-revolutions].

As I wanted to have this kind of workflow for our projects which bundle with [browserify] I did a bit of experimentation
and found that this is indeed possible. A short video tutorial will demonstrate, but here are the main steps:

1. bundle your code via browserify and make sure to have it include source maps, i.e. `browserify -d main.js > bundle.js`
2. open the served page in chrome and open devtools, open the Sources tab and in there the left sidebar with it's own
  Sources tab
3. right click any file in there (except the bundle itself) once to [create a workspace folder](http://youtu.be/ODbdGAJtU38?t=1m20s) 
  and again to [map the networked file to a system resource](http://youtu.be/ODbdGAJtU38?t=2m8s)
4. now you are able to edit the file in devtools, save it and have the changes persisted to your filesystem
5. in order to have the bundle auto update, use any of the following tools or create your own server that bundles on demand
  - [beefy](https://github.com/chrisdickinson/beefy)
  - [watchify](https://github.com/substack/watchify)
  - [more here](https://github.com/substack/node-browserify/wiki/browserify-tools#wiki-web-server-tools)

<iframe width="640" height="480" src="//www.youtube.com/embed/ODbdGAJtU38" frameborder="0" allowfullscreen></iframe>

[Remy Sharp never has to leave devtools]:http://remysharp.com/2012/12/21/my-workflow-never-having-to-leave-devtools/
[chrome-devtools-revolutions]:http://www.html5rocks.com/en/tutorials/developertools/revolutions2013/
[addy osmani improving productivity with chrome dev tools]:https://www.youtube.com/watch?v=kVSo4buDAEE
[browserify]:https://github.com/substack/node-browserify

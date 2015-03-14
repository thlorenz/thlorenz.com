---
title:  Handling multiple failing async requests
date:   Tue Sep 18 2012 17:46:55
tags:   javascript async nodejs  
lunr:   true
template: post.html
---

Especially when working with serverside javascript, there are a lot of cases where we need to perform a set of
asynchronous tasks, and call back with a result when all are done.

Lets take the example of filtering files from multiple entries.

```js
function filterFiles (entries, cb) {
  var tasks = entries.length
    , files = [];

  if (tasks === 0) cb(null, []);

  entries.forEach(function (entry) {
    fs.stat(entry, function (err, stat) {
      if (err) return cb(err);

      if (stat.isFile()) files.push(entry);

      if (--tasks === 0) cb(null, files);
    });
  });
}
```

Unfortunately, if one of those file operations where to fail, we'd still kick off the remaining ones if they are queued.
Additionally we will call back with an error multiple times if more than one fail. 

In lots of scenarios though, if the first one fails, the remaining ones would also, so calling back with an error is
exactly once is preferred.

We can use an `abort` flag to accomplish this, as shown in the below snippet.

```js
function filterFiles (entries, cb) {
  var tasks = entries.length
    , abort = false
    , files = [];

  if (tasks === 0) cb(null, []);

  entries.forEach(function (entry) {
    if (abort) return;
    fs.stat(entry, function (err, stat) {
      if (abort) return;
      if (err) { abort = true; return cb(err); }

      if (stat.isFile()) files.push(entry);

      if (--tasks === 0) cb(null, files);
    });
  });
}
```

If any of our `fs.stat` requests errors out, we set the abort flag and call back with an error (one time).

On line 9 we make sure that we don't kick off any more stat requests in case abort was signaled by a previous request
that errored out.

On line 11 we prevent requests that were pending while the first one errored out and now are calling back with an error, 
from activating our error handler again.

It's pretty simple, but makes our code behave a lot better.

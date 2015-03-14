---
title:  The Power of NodeJS Streams and the event-stream Module
date:   Mon Oct 01 2012 08:30:28
tags:   nodejs streams javascript 
lunr:   true
template: post.html
---

Streams are the number one topic in the nodejs community this year, so I decided to get a better understanding of what
everybody is talking about by reading through one of the most cited libraries related to streams.

I took a look at [Dominic Tarr](https://github.com/dominictarr)'s [event-stream module](https://github.com/dominictarr/event-stream) and do understand now why people
are so excited.

It's all about piping and transforming data as is common in functional languages (e.g, Haskell). 

As pointed out by James Halliday (aka substack) in his [lxjs
talk](http://www.youtube.com/watch?v=lQAV3bPOYHo&feature=plcp) this approach is also a big part of Unix.

Unix is all about using lots of tools - which each of which do only one small thing - and string them together to archieve a bigger
goal.

In nodejs/javascript land the tools are modules. 

Not all of them implement the streaming API, and that is where modules like event-stream come in. 

It allows modules that only focus on one aspect to be wrapped in order to expose their functionality via a streaming
API.

Additionally if the outputs of one module don't match the inputs of the other, we can use event-stream's features to transform
them so that they do.

Finally nodejs's core modules support streams (e.g.,
[fs.createReadStream](http://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options)
and [http.request](http://nodejs.org/api/http.html#http_request_pause)), which allows to handle certain tasks via streams
from beginning to end.

Below are my notes I took while reading through [event-stream](https://github.com/dominictarr/event-stream) and related
modules.

If you want to run the examples do the following:

```sh
git clone git://github.com/thlorenz/thlorenz.com-blog.git
cd thlorenz.com-blog/event-stream
npm install
cd snippets
```

Now you can run each snippet with `node`.

Also if you have suggestions, additions or corrections, please fork this blog. I'm open to pull requests.

## Modules that support event-stream

Event stream uses and exposes a bunch of useful functions that have been split up into separate modules.

This has the advantage that they can be used separately and/or swapped out as needed.

In order to understand the [event-stream module](https://github.com/dominictarr/event-stream) we need to look at them
first.

### [through](https://github.com/dominictarr/through)

- shortcut to create duplex stream
- handles pause and resume
- optionally supply `write` and `end` methods into which underlying stream is passed via `this`
- basis for synchronous streams in event-stream

#### Under the hood

- internal `stream.write` call returns `!stream.paused`
- takes care to `end` and `destroy` underlying stream properly (i.e. not prematurely)
- `this.queue(data)` pushes data onto the `stream.buffer` and then `stream.drain`s it (unless it is paused)
- `this.queue(null)` will emit `'end'`
- `drain` emits all `'data'` in the buffer and finally `'end'`

### [split](https://github.com/dominictarr/split/blob/master/package.json)

- splits the upstream data into chunks and emits them separately

#### Under the hood

- uses [through](https://github.com/dominictarr/through) to intercept the upstream writes
- splits buffer using `string.split` and emits pieces separately

#### Example

We split a file it into separate lines and re-emit them one by one with number of characters prepended. 

Additionally we keep track of the number of lines and emit that information when the read stream ends.

```js
var through =  require('through')
  , split   =  require('split')
  , fs      =  require('fs');

function count () {
  var lines = 0
    , nonEmptyLines = 0;

  return through(
    function write (data) {
      lines++;
      data.length && nonEmptyLines++;
      this.emit('data', 'chars: ' + data.length + '\t' + data + '\n');
    }
  , function end () {
      this.emit('data', 'total lines: ' + lines + ' | non empty lines: ' + nonEmptyLines);
      this.emit('end');
    }
  );
}

fs.createReadStream(__filename, { encoding: 'utf-8' })
  .pipe(split())
  .pipe(count())
  .pipe(process.stdout);
```

##### Output:

```text
➝  node through
chars: 33 var through =  require('through')
chars: 31   , split   =  require('split')
chars: 29   , fs      =  require('fs');
chars: 0  
chars: 19 function count () {
chars: 15   var lines = 0
chars: 24     , nonEmptyLines = 0;
chars: 0  
chars: 17   return through(
chars: 27     function write (data) {
chars: 14       lines++;
chars: 37       data.length && nonEmptyLines++;
chars: 70       this.emit('data', 'chars: ' + data.length + '\t' + data + '\n');
chars: 5      }
chars: 21   , function end () {
chars: 90       this.emit('data', 'total lines: ' + lines + ' | non empty lines: ' + nonEmptyLines);
chars: 23       this.emit('end');
chars: 5      }
chars: 4    );
chars: 1  }
chars: 0  
chars: 54 fs.createReadStream(__filename, { encoding: 'utf-8' })
chars: 16   .pipe(split())
chars: 16   .pipe(count())
chars: 24   .pipe(process.stdout);
total lines: 25 | non empty lines: 22
```

### [map-stream](https://github.com/dominictarr/map-stream)

- takes an asnynchronous function and turns it into a through stream
- the async function has this signature: `function (data, callback) { .. }`
- three ways to invoke callback - pretty much following accepted nodejs pattern (except for the last one):
  - transform data:  `callback(null, transformedData)`
  - emit an error:   `callback(error)`
  - filter out data: `callback()`
- (not documented) returning `false` from the mapping function will apply
  [backpressure](https://github.com/substack/stream-handbook#backpressure) in order to prevent upstream from emitting
  data faster than it can handle

#### Under the hood

- a stream is created
- when `stream.write` is called the mapper function is invoked with the given arguments and a `next` function as the
  callback
- when mapper calls `next`, it is delegated to the stream as follows:
  - `next` is invoked with an error => `stream.emit('error', err)`
  - `next` is invoked with a result => `stream.emit('data', res)`
  - `next` is invoked without arguments => nothing gets emitted and therefore that piece of data gets dropped
- if the stream was paused (due to backpressure) and all inputs where mapped, the stream is `drain`ed (this is archieved
  by keeping count of streamed inputs and mapped outputs)

#### Example

Similar to above except here we filter out empty lines and don't emit the number of lines at the end.

```js
var map   =  require('map-stream')
  , split =  require('split')
  , fs    =  require('fs');

function count () {
  return map(function (data, cb) {
    // ignore empty lines
    data.length ? 
      cb(null, 'chars: ' + data.length + '\t' + data + '\n') : 
      cb();
  });
}

fs.createReadStream(__filename, { encoding: 'utf-8' })
  .pipe(split())
  .pipe(count())
  .pipe(process.stdout);
```

##### Output:

```text
➝  node map-stream.js 
chars: 34	var map   =  require('map-stream')
chars: 29	  , split =  require('split')
chars: 27	  , fs    =  require('fs');
chars: 19	function count () {
chars: 34	  return map(function (data, cb) {
chars: 25	    // ignore empty lines
chars: 18	    data.length ? 
chars: 63	      cb(null, 'chars: ' + data.length + '\t' + data + '\n') : 
chars: 11	      cb();
chars: 5	  });
chars: 1	}
chars: 54	fs.createReadStream(__filename, { encoding: 'utf-8' })
chars: 16	  .pipe(split())
chars: 16	  .pipe(count())
chars: 24	  .pipe(process.stdout);
```

### [duplexer](https://github.com/Raynos/duplexer)

- `duplex (writeStream, readStream)`
- creates a duplex (readable and writable) stream from two streams, one of which is `readable` and the other being
  `writable` 

#### Under the hood

- creates a new stream and returns it
- proxies all write methods of the write stream to the new stream
- proxies all read methods and events of the read stream to the new stream
- proxies `writable` and `readable` properties to the appropriate streams
- reemits errors of both streams via the new stream

### [pause-stream](https://github.com/dominictarr/pause-stream)

- fixes badly behaved streams, that don't pause/resume correctly
- strictly buffers when paused because either:
  - stream was paused manually
  - downstream's `stream.write()` returned false to signal that the upstream should slow down
- if upstream buffer writes while paused, that data is pushed onto the underlying buffer
- when stream is resumed or downstream emits `'drain'` the underlying buffer is drained and its data `emit`ted
  downstream

### [from](https://github.com/dominictarr/from/blob/master/readme.markdown)

This module is neither used nor documented inside [event-stream](https://github.com/dominictarr/event-stream).

I only include it here for completeness' sake.

- takes getChunk func and returns a stream
- getChunk:
  - emits data to push 
  - emits end to signal or returns false (if synchronous) if it is finished (optional)
  - calls passed `next()` whenever it is ready for next chunk
  - `this` is assigned to underlying stream
- optionally takes Array of chunks which will be piped throught the stream synchronously

## [event-stream](https://github.com/dominictarr/event-stream)

Exposes all functions from the modules described above.

It also introduces additional functions. Some of those are implemented using the above described module functions as
building blocks.

### [mapSync](https://github.com/dominictarr/event-stream#mapsync-syncfunction)

- same as [map-stream](https://github.com/dominictarr/map-stream), but callback is called synchronously and the given
  function returns the result instead of calling back with it

#### Under the hood

- intercepts the stream using [through](https://github.com/dominictarr/through) and does the following on
  `stream.write`:
  - calls the map function
  - `stream.emit`s the returned result unless it is `undefined`

#### Example

Exact same as `map-stream` example above with same kind of output.

```js
var mapSync =  require('event-stream').mapSync
  , split   =  require('split')
  , fs      =  require('fs');

function count () {
  return mapSync(function (data) {
    // ignore empty lines
    return data.length ? 
      'chars: ' + data.length + '\t' + data + '\n' : 
      undefined;
  });
}

fs.createReadStream(__filename, { encoding: 'utf-8' })
  .pipe(split())
  .pipe(count())
  .pipe(process.stdout);
```

### Array/String operations

### [join](https://github.com/dominictarr/event-stream#join-seperator)

- emits a separator between each chunk of data (similar to `Array.join`)

#### Under the hood

- intercepts the stream using [through](https://github.com/dominictarr/through) and does the following on
  `stream.write`:
  - `stream.emit`s separator
  - `stream.emit`s the actual data

#### Example

We first split the data into lines and then join them together, injecting an extra line each time.

```js
var join  =  require('event-stream').join
  , split =  require('split')
  , fs    =  require('fs');

fs.createReadStream(__filename, { encoding: 'utf-8' })
  .pipe(split())
  .pipe(join('\n******\n'))
  .pipe(process.stdout);
```

##### Output:

```text
➝  node join
var join  =  require('event-stream').join
******
  , split =  require('split')
******
  , fs    =  require('fs');
[..]
```

### [replace](https://github.com/dominictarr/event-stream#replace-from-to)

- takes `from` (`String` or `RegExp`) and `to` argument and replaces `from` with `to`

#### Under the hood

- pipes the stream data through `split(from)` and then `join(to)`s it

#### Example

The below has the exact same effect as the above example for `join`.

```js
var replace =  require('event-stream').replace
  , fs    =  require('fs');

fs.createReadStream(__filename, { encoding: 'utf-8' })
  .pipe(replace('\n', '\n******\n'))
  .pipe(process.stdout);
```

### JSON converters 

### [parse](https://github.com/dominictarr/event-stream#parse)

- parses JSON chunks 

#### Under the hood

- intercepts the stream using [through](https://github.com/dominictarr/through)
- converts `data` string to a JavaScript object via `JSON.parse` and `stream.emit`s it

### [stringify](https://github.com/dominictarr/event-stream#stringify)

- converts JavaScript objects to a `String`
- works in tandem with `parse` and therefore escapes whitespace and terminates each object with `'\n'`
- supports `Buffer`s and plain JavaScript objects

#### Under the hood

- intercepts the stream using [mapSync](https://github.com/dominictarr/event-stream#mapsync-syncfunction)
- returns result of `JSON.stringify` of the input

#### Example

This example should give a glimpse on how powerful streams can be.

Notably, the ability to inject simple transformer functions in order to adapt outputs to inputs expected by the
function that is next in the flow is important.

This allows to compose all kinds of small functions that do one tiny thing in order to archieve quite complex tasks in a
most performant way with the smallest memory footprint possible.

The comments should suffice to show what is going on in the code.

```js
var Stream    =  require('stream')
  , es        =  require('event-stream');

function objectStream () {
  var s = new Stream()
    , objects = 0;

  var iv = setInterval(
      function () {
        s.emit('data', { id: objects, created: new Date() });
        if (++objects === 3) {
            s.emit('end');
            clearInterval(iv);
        }
      }
    , 20);
  return s;
}

function tap () {
  return es.through(
    function write (data) {
      console.log('\n' + data);
      this.emit('data', data);
    }
  );
}

function padId () {
  return es.mapSync(function (obj) {
    obj.id = '000' + obj.id;
    return obj;
  });
}

objectStream()
  .pipe(es.stringify())   // prepare for printing
  .pipe(tap())            // print intermediate result
  .pipe(es.parse())       // convert back to object
  .pipe(padId())          // change it a bit
  .pipe(es.stringify())   // prepare for printing
  .pipe(process.stdout);  // print final result
```

##### Output:

```text
➝  node json

{"id":0,"created":"2012-10-01T12:10:13.905Z"}

{"id":"0000","created":"2012-10-01T12:10:13.905Z"}

{"id":1,"created":"2012-10-01T12:10:13.928Z"}

{"id":"0001","created":"2012-10-01T12:10:13.928Z"}

{"id":2,"created":"2012-10-01T12:10:13.950Z"}

{"id":"0002","created":"2012-10-01T12:10:13.950Z"}
```

### [readable](https://github.com/dominictarr/event-stream#readable-asyncfunction)

- creates a `readable` stream from an async function
- that stream respects `pause`
- function has the following signature `function (count, callback) { .. }`
- the underlying stream is passed via `this`
- anytime `this.emit` is called from inside the function, that data is passed downstream
- the passed `callback` needs to be called to signal that we are ready to be called again
- an optional `continueOnError` flag can be passed to configure if the stream will end on error or not
- while the stream is not paused the given function will be called repeatedly

#### Under the hood

- the nodejs event loop is used to continuously poll the passed function and `stream.emit` the generated data
- a `readable` stream is created to be passed into the function as `this`
- the function is polled on every `process.nextTick` unless it is currently handling a request or the stream is ended or
  paused
- when the function calls back with an error it is handled as follows:
  - if `continueOnError` is true nothing happens
  - otherwise `stream.emit('end')` is called
- when the function calls back with data it is `stream.emit`ted

#### Example

Ten Squares shows how to use plain old callback to pass on data.

```js
var es = require('event-stream');

function tenSquares (count, cb) {
  return count < 10 ? cb(null, count * count) : this.emit('end');
}

es.readable(tenSquares)
  .pipe(es.stringify())
  .pipe(process.stdout);
```

##### Output:

```text
➝  node readable-squares
0
1
4
9
16
25
36
49
64
81
```

Three Cubes shows how to manually `stream.emit` the data and then invoke the callback to be called again.

Note how we can emit as many times as we like.

```js
var es = require('event-stream');

function threeCubes (count, cb) {
  if (count < 3) {
    this.emit('data', 'Cubing ' + count);
    this.emit('data', count * count * count);
    this.emit('data', 'OK');
    cb();
  } else {
    this.emit('end');
  }
}

es.readable(threeCubes)
  .pipe(es.stringify())
  .pipe(process.stdout);
```

##### Output:

```text
➝  node readable-cubes
"Cubing 0"
0
"OK"
"Cubing 1"
1
"OK"
"Cubing 2"
8
"OK"
```

### [readArray](https://github.com/dominictarr/event-stream#readarray-array)

- creates a `readable` stream from an Array
- each item is piped separately downstream

#### Under the hood

- a `readable` stream is created
- the array is iterated over and each item `stream.emit`ted
- the iterating process can be interrupted when the stream ends or is paused 
- in case the iteration was interrupted the stream a continuous attempt to resume the stream is made
  (`process.nextTick`)

### [writeArray](https://github.com/dominictarr/event-stream#writearray-callback)

- creates a `writable` stream from a callback
- when the upstream ends, the callback is invoked with an array into which the emitted items were buffered

#### Under the hood

- a `writable` stream and an empty array are created 
- whenever a `stream.write` occurs, the written item is pushed onto the created array
- when `stream.end` is invoked the callback is called with the buffered items
- when an error occurs (i.e. when an attempt to destroy the stream before it was ended is made), the callback is invoked
  with the error

#### Example

We use `readArray` to generate a stream of values which we the multiply by 10 and pipe into `writeArray` so we can
validate the resulting array.

```js
var es = require('event-stream') ;

function multiplyByTen (item, cb) {
  // long running async operation ;)
  setTimeout(
      function () { cb(null, item * 10); }
    , 50
  );
}

function validate(err, array) {
  if (!err && array.toString() === '0,10,20,30')
   console.log('OK');
  else 
   console.log('NOT OK');
}

es.readArray([0, 1, 2, 3])        // generate data
  .pipe(es.map(multiplyByTen))    // transform asynchronously 
  .pipe(es.writeArray(validate)); // validate and print result
```

##### Output:

```text
➝  node readArray
OK
```

### [child](https://github.com/dominictarr/event-stream#child-child_process)

- creates a through stream from a child process

#### Under the hood

- creates a duplex stream from the `child.stdin` and `child.stdout`

#### Example

```js
var cp = require('child_process')
  , fs = require('fs')
  , es = require('event-stream');

// same as: > cat thisfile | grep Stream
fs.createReadStream(__filename)
  .pipe(es.child(cp.exec('grep Stream')))
  .pipe(process.stdout);
```

##### Output:

```text
➝  node child
// same as: > cat thisfile | grep Stream
fs.createReadStream(__filename)
  .pipe(es.child(cp.exec('grep Stream')))
```

### [wait](https://github.com/dominictarr/event-stream#wait-callback)

- aggregates `emit`ted chunks of a stream into a single string and `emit`s it when the stream `end`s
- optionally also invokes a callback with the final string

#### Under the hood

- intercepts the stream using [through](https://github.com/dominictarr/through) and appends `stream.write` chunks to a
  single string
- on `stream.end` `emit`s that string followed by `stream.end` and calls callback with the string if it was passed

#### Example

We emit an array of characters via `readArray` and use `wait` to aggregate them into one string so we can then surround
it using `mapSync`.

```js
var es = require('event-stream');

es.readArray([ 'e', 'l', 'u', 'r', ' ', 's', 'm', 'a', 'e', 'r', 't', 's' ].reverse())
  .pipe(es.wait())
  .pipe(es.mapSync(function (data) { return '"' + data + '!"'; }))
  .pipe(process.stdout);
```

##### Output:

I leave this one to the reader to find out :)

### [pipeline](https://github.com/dominictarr/event-stream#pipeline-stream1streamn)

- turns multiple streams into a single stream which writes to the first stream and reads from the last
- `pipeline(s1, s2, s3)` is syntactic sugar for `s1.pipe(s2).pipe(s3)` 

#### Under the hood

- creates a `duplex` stream from the first and the last stream
- iterates through all streams and pipes adjacent ones into each other
- sets up error handling so that an error will bubble all the way to the last stream if it is emitted from any of the
  streams inside the chain

#### Example

```javascript
someStream()
  .pipe(parse())         
  .pipe(stringify())      
  .pipe(process.stdout);

// can be rewritten as
es.pipeline(
    someStream()
  , parse()
  , stringify()
  , process.stdout
);
```

I hope this helps to shine some light on the power and inner workings of streams and associated modules.

Reading through these surely did hat for me, so I encourage you to do the same.

Be on the lookout for more posts about streaming, but in the meantime I recommend the following nodejs stream resources:

- substack's [stream handbook](https://github.com/substack/stream-handbook)
- Max Ogden's [Node Streams: How do they work?](http://maxogden.com/node-streams)
- Dominic Tarr's [High level style in JavaScript](https://gist.github.com/2401787)
- [core stream documentation](http://nodejs.org/docs/latest/api/stream.html#stream_stream)

---
title:  Benchmarking Rust Code on OSX 
date:   Sat Jan 30 2021 14:51:38
tags:   rust, perf
lunr:   true
template: post.html
---

Today I went through the rust wasm tutorial and learned a bunch especially regarding performance
via [this section](https://rustwasm.github.io/docs/book/game-of-life/time-profiling.html).

This tutorial explains benchmarking using browser tools like `console.time`, but I'll focus on
the lower level benchmarking part here.

The author uses `perf` after `cargo bench` to visualize which doesn't exist on OSX, but I
discovered [cargo instruments](https://github.com/cmyr/cargo-instruments)  as well as [rust
flamegraph](https://github.com/flamegraph-rs/flamegraph). The latter worked a bit better to
just find bottlenecks.

## cargo instruments

I had to install this tool via `brew install cargo-instruments` as it didn't build with cargo.

You can list all available _templates_ via `cargo instruments --list`.

Assuming a `/benches/bench.rs`, a typical run through would be: 

```sh
cargo instruments -t alloc --bench bench
open target/instruments/my_bin_YYYY-MM-DD-THH:MM:SS.trace
```

_Note_: `time` template did not result in any data showing in _Instruments_, but `alloc` and
`sys` did show some data which is why I am using the former for this example even though it
actually measures memory allocations instead of CPU usage and timing.

_Once in the Instruments UI make sure to scroll down to see the app in some cases._

## rust flamegraphs

However in the [same redit
thread](https://www.reddit.com/r/rust/comments/b20eca/introducing_cargoinstruments_zerohassle_profiling/)
[rust flamegraph](https://github.com/flamegraph-rs/flamegraph) was mentioned which I then
tried.

```sh
cargo install flamegraph
```

Add this to `Cargo.toml` to get better symbols in the flamegraph.

```toml
[profile.bench]
debug = true
```

Run the below. `sudo` is necesary to usd _dtrace_ properly.

```sh
sudo cargo flamegraph --bench bench
```

Then open the flamegraph.

```sh
open flamegraph.svg
```

### Cleanup

Unfortunately after running with `sudo` you end up with a file in your
`target/release/.fingerprint` folder which causes permission problems later. It'll look something like
this.

```
drwxr-xr-x   7 user      admin   224B Jan 30 14:05 project-name-5063881d9843ce56/
drwxr-xr-x   7 root      admin   224B Jan 30 14:26 project-name-58809faea7027018/
```

As you can see the second one is only accessible via `root` and you need to manually remove it
before cargo is happy again.

However another one like this exists, i.e. `/target/release/deps/bench-<some-id>.d`.

So in the end I just did `sudo rm -rf target/` to clean things up in one go. However that
incurred a recompile so improvement is possible here.

## bench compare

Back to the tutorial, if we don't need to see visualizations but just compare benchmarks after a
chnage we'd proceed as follows.

Install the tool:

```sh
cargo install cargo-benchcmp
```

Then proceed:

```sh
cargo bench | tee before.txt

# Make changes you think imporve perf

cargo bench | tee after.txt
```

Once you have that perf data just run the following to get a summary of differences.

```sh
cargo benchcmp before.txt after.txt
```

It'll look something like the below and in this case shows a 10x speedup.

```
name            before.txt ns/iter  after.txt ns/iter  diff ns/iter   diff %  speedup
universe_ticks  862,931             82,187                 -780,744  -90.48%  x 10.50
```

---
title:  Run valgrind from your Mac via a remote Linux machine
date:   Mon Feb 17 2014 16:19:36
tags:   valgrind osx unix make 
lunr:   true
template: post.html
---

## valgrind doesn't love your Mac as much as you do

So you decided to write some C/C++ and you want to do so on your Mac since you like the gestures and/or other niceties
that a Linux distro can't give you? 

Well, given you are on OSX 10.9.x (Mavericks) you'll soon find, that [valgrind is not
supported there yet](https://bugs.kde.org/show_bug.cgi?id=326724). This will eventually get fixed, but by then the next
OSX version will be out and you will want to upgrade - only to face the same problem all over again

## The Best of Both Worlds

There is a way to work around this issue by running `valgrind` against your code on a linux machine, virtual or
whatever, but keep developing on your Mac. 

I happen to have a desktop lying around, which I bought a month before realizing that Windows stinks (entirely different
story) and after trying twice to hackintosh it, I installed Ubuntu. So I figured I could use it to develop/test my C
code which was leaking memory allover the place.

I tried a few different options and list them here for reference along with the reason why they didn't cut it for me,
followed by the final option which worked just perfect.

### `ssh` into the Linux Machine and develop and test there entirely -> *ok*

That works nicely if you can live with the slight delay between typing and the result appearing in your editor. Not
an option for me

### Remote Edit Files with Vim -> *ok*

This is an [ok option](http://vim.wikia.com/wiki/Editing_remote_files_via_scp_in_vim), but has the disadvantage that you
have no context since the file you are editing actually gets `scp`d into your local `tmp` dir and back to the remote
machine every time you save. Therefore there is no way to quickly see/open related files either with `Ctrl-P` or
`NERDTree`.

Additionally it is annoying that the local files of your project keep going out of sync with the ones on your remote
machine.

### `rsync` your project `valgrind` it via a simple `make` target -> *perfect*

Now this worked just perfect for me. Here is the gist:

- create an `rsync` make target which copies all needed files to your remote machine - we use `rsync` because `scp`
  doesn't cut it since it doesn't allow `--exclude`ing files and you surely don't want to copy you `.git` dir
- create a `valgrind` make target 
- create a remote `valgrind` make target which `rsync`s your project and then executes the local `valgrind` target on
  the remote machine via `ssh`

Here is a sample `Makefile` which contains only the targets relevant to run `valgrind`:

```sh
VFLAGS = --track-origins=yes --tool=memcheck --leak-check=yes --error-exitcode=1

rsync:
	ssh udesktop 'rm -rf tmp/ee'
	rsync -ra -e ssh --exclude '/.git' --exclude '/bin' --exclude '/deps/**/*.o' --exclude '/build' . udesktop:tmp/ee

grind: $(TESTS)
	set -e; for file in bin/test/*; do echo "\n\033[00;32m+++ $$file +++\033[00m\n" && valgrind $(VFLAGS) ./$$file; done

rgrind: rsync
	ssh udesktop 'cd tmp/ee && make clean && make grind'
```

**Note** that `udesktop` is the remote machine that I configured in `~/.ssh/config`:

```sh
host udesktop
  User my_username
  Hostname 192.168.1.99
  Port 3333 
```

Now running `make rgrind` takes just a few seconds to give you the much wanted `valgrind` report:

![valgrind](https://raw.github.com/thlorenz/thlorenz.com-blog/master/assets/images/valgrind.png)

In case you want a more detailed report you could add the following targets to your `Makefile`:

```sh
grind-report: $(TESTS) 
	for file in $^; do \
		echo "\n \033[00;34m+++ $$file +++ \033[00m\n" && \
		G_SLICE=always-malloc G_DEBUG=gc-friendly \
		valgrind $(VFLAGS) -v --num-callers=40 --log-file=valgrind.log ./$$file; \
	done

rgrind-report: rsync
	ssh udesktop 'cd tmp/ee && make clean && make grind-report'
	scp udesktop:tmp/ee/valgrind.log .
	cat valgrind.log
```

To see a full example, please review either [thlorenz/ee.c](https://github.com/thlorenz/ee.c) or [thlorenz/sync-stream.c](https://github.com/thlorenz/sync-stream.c) and have a look into the
`valgrind.mk` file.

## Dealing with `make` warnings about timing issues

If your target machine's clock is running behind the one on your local machine, make will warn you that the `.c` files
are newer than the current time. You can easily fix this by managing the time on your remote machine as [explained here
for ubuntu](http://codeghar.wordpress.com/2007/12/06/manage-time-in-ubuntu-through-command-line/).

## Continuous Integration with Travis

You've set things up this far, you might as well have these tests run every time you push to your repository.
Assuming you installed the [travis-ci](http://docs.travis-ci.com/user/getting-started/) hook, adding this simple
`.travis.yml` to your project will do just that.

```sh
language: c
compiler:
  - clang
install:
  - sudo apt-get -qq install valgrind
script: make CC=$CC grind
```

*Please feel free to ask questions and/or leave comments [relating to this post](https://github.com/thlorenz/thlorenz.com-blog/issues/7).*

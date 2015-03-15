---
title:  Viewing man pages in Vim and Preview
date:   Sunday, January 26th, 2014, 9:19:49 PM
tags:   unix
lunr:   true
template: post.html
---
I recently came upon a collection of neat things you can do in the terminal on
[stackoverflow](http://apple.stackexchange.com/questions/5435/got-any-tips-or-tricks-for-terminal-in-mac-os-x).

[One of the *tricks*](http://apple.stackexchange.com/a/5461) mentioned better ways to view man pages. From that answer I
added two functions to my bash setup:

```sh
# Open a man page in vim
vman () {
  MANWIDTH=150 MANPAGER='col -bx' man $@ | vim -R -c "set ft=man" -
}

# Open a man page in Preview:
pman () {
  man -t $@ | open -f -a /Applications/Preview.app
}

```

While `pman` is almost (see comments) exactly as found in the answer, `vman` was adapted from `tman` to work with vim.

## vman

The `vman` one liner basically just configures `man` to stay within a certain column range and pipes the result to vim
as a readonly file with filetype `man`.

The nice thing when opening the page in vim is that you can follow links and functions simply by placing your cursor
over the name and `CTRL-]`. You can backtrack via `CTRL-O`.

This even works in MacVim (I tried it), simply replace `vim` in the function with `mvim`.

![vman](https://raw.github.com/thlorenz/thlorenz.com-blog/master/assets/images/vman.gif)

## pman

`pman` simply opens the man page in the `Preview` app and thus only works on Mac. The result is a man page that's much
more readable at least for my eyes, but judge for yourself.

Note that the first time you use it there is a slight delay before the page is rendered, but for all uses after that it
comes up very quickly. I guess that some plugin is installed on first run to allow rendering postscript.

![pman](https://raw.github.com/thlorenz/thlorenz.com-blog/master/assets/images/pman.png)

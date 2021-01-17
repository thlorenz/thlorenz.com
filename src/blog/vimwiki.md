---
title:  vim wiki to organize existing documents and more
date:   Sun Jan 17 2021 17:03:22
tags:   vim 
lunr:   true
template: post.html
---

## Discovering Vimwiki

Today was another of those weekend days where I start out on a project I wanted to continue on
and magically discover some vim feature which I then have to follow all the way into the rabbit
hole. Today one of those was [vimwiki](https://github.com/vimwiki/vimwiki).

As a background a made a short foray into trying to use Emacs since I was unhappy how vim
plugins foro language support worked. After a while I realized that Emacs plugins don't work
much better and instead tweaked my vim setup to get better results. However while on that short
journey I discovered [org mode](https://orgmode.org/) which I found super useful to organize
project research, todos and more. Naturally after switching back to vim I missed it a bit and
didn't immediately find a replacement.

Today when I saw [vimwiki](https://github.com/vimwiki/vimwiki) I realized that it is featured
enough to at least organize project todos, research with interlinked documents and possibly
even a diary to note misc things to find them later.

## Connecting Vimwiki to existing organized Documents

Since I already have a repo for this blog and a [dox](https://github.com/thlorenz/dox) repo I figured out a way to link those instead
recreating or copying them in vimwiki.

My current vimwiki folder structure looks like this:

```text
.
├── blog -> /Users/thlorenz/dev/thlorenz/thlorenz.com/src/blog
├── diary
│   ├── 2021-01-17.md
│   └── diary.md
├── dox -> /Users/thlorenz/dev/misc/dox
├── index.md
└── projects
    └── rust.md
```

I then include links into dox and blog entries inside the main index page so that I can quickly
jump back and forth, as an example here are some links into the dox repo.

```md
### Admin

- [bash](dox/admin/bash.md)
- [dtrace](dox/admin/dtrace.md)
- [firewall](dox/admin/firewall.md)
```

Those links are concealed, so that I only see `bash` for instance and can hit `<Enter>` when my
cursor is on top in order to navigate there. `<Ctrl-o>` gets me back to where I was.

As I understand each of those can be _suborganized_ by adding an `index.md` in its root as
vimwiki treats each as a _subwiki_ which can be listed via `<leader> ws`.

## Tweaking the Markdown Plugin and Instant Markdown Preview

When opening a `set ft=vimwiki` document (which is set when opening a vimwiki file via one of
the provided shortcuts), some extra features are activated, i.e. code blocks are highlighted
and clicking on a link navigates to the local file or opens it in the browser if it is a URL.

It also _conceals_ those links.  Editing those _concealed_ links is hard as you cannot easily
move the cursor inside the actual link in normal mode. Therefore I recommend you to add a quick
option to toggle the markdown `conceallevel`. To this end I added the following to my `.vimrc`.

```vim
au FileType markdown,vimwiki noremap <leader>mc :call ToggleConcealLevel()<CR>
function! ToggleConcealLevel()
    if &conceallevel
        setlocal conceallevel=0
    else
        setlocal conceallevel=2
    endif
endfunction
```

To quickly preview the markdown entry/post I'm writing I added a shortcut to launch it and
disabled it auto-launching when I open a markdown file.

Here's my `instant-markdown` _plug_ with those settings.

```vim
Plug 'instant-markdown/vim-instant-markdown', {'for': 'markdown', 'do': 'npm -g install instant-markdown-d'}
  let g:instant_markdown_autostart = 0
  au FileType markdown,vimwiki nnoremap <leader>md :InstantMarkdownPreview<CR>
```

## En Fin

There are lots more blog posts and YouTube videos about vimwiki so I'm not going to detail how
to navigate and such here, instead I'll just link [this cheatsheet](http://thedarnedestthing.com/vimwiki%20cheatsheet) which I found very useful
and encourage you to give it a try. For the impatient here's my `vimwiki` _plug_ inside my
`.vimrc` which sets _markdown_ as the default format and remaps the shortcut to toggle a list todo item.

```vim
Plug 'vimwiki/vimwiki'
  let g:vimwiki_list = [{'path': '~/.wiki', 'syntax': 'markdown', 'ext': '.md'}]
  au FileType vimwiki nmap <leader>tl <Plug>VimwikiToggleListItem
  au FileType vimwiki vmap <leader>tl <Plug>VimwikiToggleListItem
```

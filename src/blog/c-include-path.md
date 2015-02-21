---
title:  How to find the include path of a globally installed C library 
date:   Sun Dec 15 2013 13:21:49
tags:   c
lunr:   true
template: post.html
---

In order to include a globally installed library via `-L` it helps to know how to find its include path, and this post
shows how to find it quickly.

**Note**: These steps have been tested on a Mac, but should work exactly the same way on Linux.

1. list all libraries to ensure that it is installed: `pkg-config --list-all`
2. find the path of the library you want to include:  `pkg-config --libs <libname>`

## Sample Session

Here is how you'd find the include string for `libedit`.

```sh
➝  pkg-config --list-all
liblzma      liblzma - General purpose data compression library
libpcrecpp   libpcrecpp - PCRECPP - C++ wrapper for PCRE
openssl      OpenSSL - Secure Sockets Layer and cryptography libraries and tools
apr-1        APR - The Apache Portable Runtime library
apr-util-1   APR Utils - Companion library for APR
libcrypto    OpenSSL-libcrypto - OpenSSL cryptography library
libpcre      libpcre - PCRE - Perl compatible regular expressions C library with 8 bit character support
libedit      libedit - command line editor library provides generic line editing, history, and tokenization functions.
libpcreposix libpcreposix - PCREPosix - Posix compatible interface to libpcre
libiodbc     iODBC - iODBC Driver Manager
libssl       OpenSSL - Secure Sockets Layer and cryptography libraries

➝  pkg-config --libs libedit
-L/usr/local/lib -ledit -lcurses
```

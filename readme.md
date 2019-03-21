# mkdo

> mkdo - Markdown task runner

## install

NPM:

```console
$ npm install -D mkdo
```

Yarn:

```console
$ yarn add --dev mkdo
```

## tasks

### build

Compiles TypeScript files into JavaScript.

```console
$ tsc -p . --outDir dist
```

### format

Runs linter to files.

```console
$ prettier-package-json --write
$ prettier --write '{bin,src}/**/*.ts'
```

#### check

Fixes format error as possible.

```console
$ prettier-package-json --list-different
$ prettier --list-different '{bin,src}/**/*.ts'
```

### ci

Check project on CI.

```console
$ yarn mkdo format:check
$ yarn mkdo sync-scripts --mkdo 'ts-node ./bin/mkdo.ts --' --check
```

## TODO

- [ ] write better document.
- [ ] add tests.
- [ ] add more executors.
  + [ ] `javascript`
  + [ ] `typescript`
  + [ ] `python`
  + [ ] `ruby`
  + and more...

## license

MIT

(C) 2019 TSUYUSATO Kitsune

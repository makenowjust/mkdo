<h1>mkdo</h1>

> mkdo - Markdown task runner

[![Build Status][travis-badge]][travis]
[![NPM version][npm-version-badge]][npm]

**Table of Contents**:

- [Installation](#installation)
- [Tasks](#tasks)
  - [build](#build)
  - [format](#format)
    - [check](#check)
  - [ci](#ci)
- [TODO](#todo)
- [License](#license)

## Installation

NPM:

```console
$ npm install -D mkdo
```

Yarn:

```console
$ yarn add --dev mkdo
```

## Tasks

### build

Compiles TypeScript files into JavaScript.

```console
$ tsc -p .
```

### format

Runs linter to files.

```console
$ prettier-package-json --write
$ prettier --write readme.md '{bin,src}/**/*.ts'
```

#### check

Fixes format error as possible.

```console
$ prettier-package-json --list-different
$ prettier --list-different readmd.md '{bin,src}/**/*.ts'
```

### ci

Tasks for running on CI.

```console
$ yarn build
$ yarn format:check
$ yarn mkdo sync-scripts --mkdo 'ts-node ./bin/mkdo.ts' --check
```

## TODO

- [ ] write better document.
- [ ] add tests.
- [ ] add more executors.
  - [ ] `javascript`
  - [ ] `typescript`
  - [ ] `python`
  - [ ] `ruby`
  - and more...

## License

MIT

(C) 2019 TSUYUSATO Kitsune

[travis-badge]: https://img.shields.io/travis/MakeNowJust/mkdo/master.svg?style=for-the-badge&logo=travis&colorA=8B6858
[travis]: https://travis-ci.org/MakeNowJust/mkdo
[npm-version-badge]: https://img.shields.io/npm/v/mkdo.svg?style=for-the-badge&logo=npm
[npm]: https://www.npmjs.com/package/mkdo

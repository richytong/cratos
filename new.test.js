const rubico = require('rubico')
const trace = require('rubico/x/trace')
const tracef = require('rubico/x/tracef')
const execa = require('execa')
const assert = require('assert')
const rimrafCb = require('rimraf')
const nodePath = require('path')
const util = require('util')
const fs = require('fs')
const { promisify } = require('util')
const cratos = require('./new')
const cratosPackageJSON = require('./package.json')

const {
  pipe, fork, assign,
  tap, tryCatch, switchCase,
  map, filter, reduce, transform,
  any, all, and, or, not,
  eq, gt, lt, gte, lte,
  get, pick, omit,
} = rubico

const pathResolve = nodePath.resolve

const rimraf = promisify(rimrafCb)

const ade = assert.deepEqual

const ase = assert.strictEqual

const git = (args, path) => execa('git', [
  `--git-dir=${pathResolve(path, '.git')}`,
  `--work-tree=${path}`,
  ...args,
])

const createProjectFixture = (path, packageJSON) => fork.series([
  path => fs.promises.mkdir(pathResolve(path), { recursive: true }),
  path => git(['init'], pathResolve(path)),
  fork([
    path => fs.promises.writeFile(
      pathResolve(path, 'package.json'),
      JSON.stringify(packageJSON, null, 2),
    ),
    path => fs.promises.writeFile(
      pathResolve(path, 'index.js'),
      `
module.exports = {}
`.trimStart(),
    ),
  ]),
])(path)

const createEmptyDirectory = path => fs.promises.mkdir(path, { recursive: true })

describe('cratos', () => {
  before(() => {
    process.env.CRATOS_PATH = 'tmp'
  })

  afterEach(async () => {
    await rimraf('tmp')
  })

  it('responds with version on --version', async () => {
    ade(
      cratos(['node', 'cratos', '--version']),
      {
        arguments: [],
        flags: ['--version'],
        command: {
          type: 'VERSION',
          body: {
            version: cratosPackageJSON.version,
          },
        },
      },
    )
  })

  it('responds with version on -v', async () => {
    ade(
      cratos(['node', 'cratos', '-v']),
      {
        arguments: [],
        flags: ['-v'],
        command: {
          type: 'VERSION',
          body: {
            version: cratosPackageJSON.version,
          },
        },
      },
    )
  })

  it('responds with usage on base command', async () => {
    ade(
      cratos(['node', './cli.js']),
      {
        arguments: [],
        flags: [],
        command: {
          type: 'USAGE',
          body: {},
        },
      },
    )
    ade(
      cratos(['/usr/bin/node', '/usr/bin/cratos', '--yo']),
      {
        arguments: [],
        flags: ['--yo'],
        command: {
          type: 'USAGE',
          body: {},
        },
      },
    )
  })

  it('responds with usage on --help', async () => {
    ade(
      cratos(['/usr/bin/node', '/usr/bin/cratos', '--help']),
      {
        arguments: [],
        flags: ['--help'],
        command: {
          type: 'USAGE',
          body: {},
        },
      },
    )
  })

  it('responds with usage on -h', async () => {
    ade(
      cratos(['/usr/bin/node', '/usr/bin/cratos', '-h']),
      {
        arguments: [],
        flags: ['-h'],
        command: {
          type: 'USAGE',
          body: {},
        },
      },
    )
  })

  /*
   * string => packageJSON {
   *   name: string,
   *   version: string,
   * }
   */
  const generatePackageJSON = s => ({
    name: `new-project-${s}`,
    version: `0.0.${s.charCodeAt(0)}`,
  })

  it('responds with list on list', async () => {
    await map(
      s => createProjectFixture(`tmp/${s}`, generatePackageJSON(s)),
    )(['a', 'b', 'c'])
    await pipe([
      cratos,
      x => {
        ade(x.arguments, ['list'])
        ade(x.flags, [])
        ase(x.command.type, 'LIST')
        ase(x.command.body.modules.length, 3)
      },
    ])(['/usr/bin/node', '/usr/bin/cratos', 'list'])
  })

  it('responds with list on ls', async () => {
    await map(
      s => createProjectFixture(`tmp/${s}`, generatePackageJSON(s)),
    )(['a', 'b', 'c'])
    await pipe([
      cratos,
      x => {
        ade(x.arguments, ['ls'])
        ade(x.flags, [])
        ase(x.command.type, 'LIST')
        ase(x.command.body.modules.length, 3)
      },
    ])(['/usr/bin/node', '/usr/bin/cratos', 'ls'])
  })

  it('responds with usage on invalid command', async () => {
    ade(
      cratos(['/usr/bin/node', '/usr/bin/cratos', 'hey']),
      {
        arguments: ['hey'],
        flags: [],
        command: {
          type: 'INVALID_USAGE',
          body: {},
        },
      },
    )
  })
})

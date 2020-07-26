import webpack from 'webpack'
import _ from 'lodash'
import path from 'path'
import fs from 'fs'
import pify from 'pify'
import hash from 'hash-sum'
import serialize from 'serialize-javascript'

type OptimizeAsyncImportOptions = {
  contextPath: string,
  settings: any[]
}

type WalkOptions = {
  base?: number,
  ignore: string
}

type WalkResult = {
  files: { [key: string]: string },
  dirs: string[]
}

type Route = {
  name: string,
  path: string,
  component: string,
  rcFilePath?: string,
  children?: Route[]
}

type RouteOptions = {
  basePath: string,
  contextPath: string
}

type AutoRouterOptions = {
  debug?: boolean
  lazyLoad?: string
  path: string
  ignore: string
  'chunk-name': any[]
}

const readdir = pify(fs.readdir)
const readFile = pify(fs.readFile)

const REGEX_ASYNC_IMPORT = /import\('([^']+)'[^)]*\)/g
const REGEX_MODULE_INDEX = /^(\/modules\/[\w-]+)*\/index\.(?:j|t)sx$/i
const REGEX_VALIDATE_DIR = /^\/(modules\/[\w-]+\/)*(modules(\/[\w-]+|)|pages)$/i
const REGEX_VALIDATE_PAGE = /^(\/modules\/[\w-]+)*\/pages\/[\w-]+\.(?:j|t)sx$/i
const REGEX_FIX_MODULE_PATH = /modules\/([\w-]+)/g

function fixPath (path: string) {
  return path.replace(/\/(modules|pages)\//g, '/')
}

async function walk (parent: string, options: WalkOptions, result?: WalkResult, ignore?: boolean) : Promise<WalkResult> {
  options.base = options.base || parent.length
  result = result || {
    files: {},
    dirs: []
  }
  let stat = fs.statSync(parent)
  let file = parent.substr(options.base).replace(/\\/g, '/')
  if (stat.isDirectory()) {
    if (!file || REGEX_VALIDATE_DIR.test(file)) {
      if (file) {
        result.dirs.push(parent)
      }
      ignore = ignore || fs.existsSync(path.join(parent, options.ignore))
      let promises = [] as Promise<WalkResult>[]
      return readdir(parent)
        .then(async (entries) => {
          for (let item of entries) {
            let childPath = path.join(parent, item)
            promises.push(walk(childPath, options, result, ignore))
          }
          return Promise.all(promises).then(() => Promise.resolve(result!))
        })
    }
  } else {
    if (REGEX_MODULE_INDEX.test(file)) {
      file = fixPath(file.replace(/\/index(\.(?:j|t)sx)$/i, '$1'))
    } else if (REGEX_VALIDATE_PAGE.test(file)) {
      file = fixPath(file)
    } else {
      file = ''
    }
    if (file && !ignore && !/^\.(j|t)sx$/i.test(file)) {
      result.files[file] = parent
      return Promise.resolve(result)
    }
  }
  return Promise.resolve(result)
}

/**
   * 删除 name: 'all' 的路由对象的name字段
   * 删除 name 末尾的index
   * @param {array} routes
   * @param {boolean} [isChild=false]
   * @returns
   */
function cleanChildrenRoutes (routes: Route[], isChild?: boolean) {
  isChild = _.isUndefined(isChild) ? false : isChild
  let start = -1
  let routesIndex = [] as string[][]
  routes.forEach(route => {
    if (/-index$/.test(route.name) || route.name === 'index') {
      // Save indexOf 'index' key in name
      let res = route.name.split('-')
      let s = res.indexOf('index')
      start = (start === -1 || s < start) ? s : start
      routesIndex.push(res)
    }
  })
  routes.forEach(route => {
    route.path = (isChild) ? route.path.replace('/', '') : route.path
    if (route.path.indexOf('?') > -1) {
      let names = route.name.split('-')
      let paths = route.path.split('/')
      if (!isChild) { paths.shift() } // clean first / for parents
      routesIndex.forEach(function (r) {
        let i = r.indexOf('index') - start //  children names
        if (i < paths.length) {
          for (let a = 0; a <= i; a++) {
            if (a === i) { paths[a] = paths[a].replace('?', '') }
            if (a < i && names[a] !== r[a]) { break }
          }
        }
      })
      route.path = (isChild ? '' : '/') + paths.join('/')
    }
    route.name = route.name.replace(/-index$/, '')
    if (route.children) {
      if (route.children.find((child: Route) => child.path === '')) {
        delete route.name
      }
      route.children = cleanChildrenRoutes(route.children, true)
    }
  })
  return routes
}

/**
 * 创建路由对象
 * @param {array} files
 * @param {string} srcDir
 */
function createRoutes (files: { [key: string]: string }, options: RouteOptions) {
  let routes = [] as Route[]
  Object.keys(files).sort().forEach(function (file) {
    let keys = file.replace(/\.(?:j|t)sx$/, '').replace(/\/{2,}/g, '/').split('/').slice(1)

    const componentFilePath = './' + path.relative(
      options.contextPath,
      files[file]
    ).replace(/\\/g, '/')

    let rcFilePath: string | undefined = files[file].replace(/(\.(?:j|t)sx)$/, '.rc$1')

    if (fs.existsSync(rcFilePath)) {
      rcFilePath = componentFilePath.replace(/(\.(?:j|t)sx)$/, '.rc$1')
    } else {
      rcFilePath = undefined
    }

    let route = {
      name: '',
      path: '',
      fullPath: '/' + keys.join('/').replace(/(^|\/)index$/i, ''),
      component: componentFilePath,
      rcFilePath
    }
    let parent = routes
    keys.forEach(function (key, i) {
      route.name = route.name ? route.name + '-' + key.replace('_', '') : key.replace('_', '')
      route.name += (key === '_') ? 'all' : ''
      let child = _.find(parent, { name: route.name })
      if (child) {
        if (!child.children) {
          child.children = []
        }
        parent = child.children
        route.path = ''
      } else {
        if (key === 'index' && (i + 1) === keys.length) {
          route.path += (i > 0 ? '' : '/')
        } else {
          // if (key !== 'modules' && key !== 'pages')
          route.path += '/' + (key === '_' ? '*' : key.replace('_', ':'))
          if (key !== '_' && key.indexOf('_') !== -1) {
            route.path += '?'
          }
        }
      }
    })
    // Order Routes path
    parent.push(route)
    parent.sort(function (ra, rb) {
      let a = ra.path
      let b = rb.path

      if (!a.length || a === '/') { return 1 }
      if (!b.length || b === '/') { return -1 }

      a = a.toLowerCase()
      b = b.toLowerCase()

      let pa = 0
      let pb = 0

      if (~a.indexOf('*')) pa += 100000 + a.indexOf('*')
      if (~a.indexOf(':')) pa += 10000 - a.indexOf(':')
      if (~b.indexOf('*')) pb += 100000 + b.indexOf('*')
      if (~b.indexOf(':')) pb += 10000 - b.indexOf(':')

      if (pa > pb) {
        return 1
      } else if (pa < pb) {
        return -1
      } else {
        if (~a.indexOf(b)) { return 1 }
        if (~b.indexOf(a)) { return -1 }
        return a > b ? 1 : -1
      }
    })
  })

  return cleanChildrenRoutes(routes)
}

function getChunkName (module: string, config: any[]) {
  module = path.relative('src', module).replace(/\\/g, '/')
  let pattern
  for (let item of config) {
    if (_.isArray(item)) {
      for (let i = 1; i < item.length; i++) {
        pattern = item[i]
        if (_.isFunction(pattern)) {
          if (pattern(module)) {
            return item[0]
          }
        } else if (_.isRegExp(pattern)) {
          if (pattern.test(module)) {
            return item[0]
          }
        }
      }
    } else if (_.isFunction(item)) {
      const name = item(module)
      if (_.isString(name) && name.length > 0) {
        return name
      }
    }
  }
  console.warn('unnamed module:', module)
  return ''
}

// 异步引入合包优化处理
function optimizeAsyncImport (code: string, options: OptimizeAsyncImportOptions) {
  if (options.settings) {
    const config = _.map(options.settings, (item) => {
      if (_.isString(item)) {
        // 字符串类型的优化配置，形如 "baseRouterPath:maxDeep"，如 "2", "moduleName:2"
        const params = item.split(':')
        if (params.length === 1) {
          if (parseInt(params[0]) + '' === params[0]) {
            params[1] = params[0]
            params[0] = ''
          } else {
            params[1] = '0'
          }
        }
        let baseRouterPath = `src/${_.trim(params[0])}`
        const maxDeep = _.trim(params[1])
        // 预处理
        baseRouterPath = baseRouterPath
          .replace(/\/+/g, '/') // 移除重复的'/'
          .replace(/^\/?(.*)(?:([^/])|\/)$/, '/$1$2') // 开头增加'/'，结尾去掉'/'
        // 将路由路径转换为文件路径目录, 如
        // /test/ -> modules/test/
        // /test/subtest/ -> modules/test/modules/subtest/
        const baseFilePathPath = baseRouterPath
          .replace(/\//g, '/modules/') // 将所有路径分隔符替换为/modules/
          .substr(1) + '/' // 开头去掉'/', 结尾增加'/'
        // 规范化路由路径
        // /test/ -> test/
        // /test/subtest/ -> test/subtest/
        baseRouterPath = baseRouterPath.substr(1).toLowerCase() + '/'
        const regExp = new RegExp(`^${baseFilePathPath.replace(/\//, '\\/')}((modules\\/[\\w-]+\\/){0,${maxDeep}}).*$`, 'i')
        return function (module: string) {
          module = `modules/src/${module}`
          if (regExp.test(module)) {
            module = module
              .replace(regExp, '$1')
              .replace(REGEX_FIX_MODULE_PATH, '$1')
            return `${baseRouterPath}${module}pages`.substr(4)
          }
        }
      }
      return item
    })
    return code.replace(REGEX_ASYNC_IMPORT, function (_, module: string) {
      const chunkName = getChunkName(
        path.resolve(options.contextPath, module),
        config
      )
      return `import('${module}' /* webpackChunkName: "${chunkName.toLowerCase()}" */)`
    })
  }
  return code
}

let generateAutoRouters = function (options: {
  basePath: string,
  files: { [key: string]: string },
  contextPath: string,
  asyncImportOptimization: any[]
  lazyLoad?: string
}) {
  return new Promise(function (resolve, reject) {
    const data = {
      uniqBy: _.uniqBy,
      router: {
        base: '/',
        routes: [] as Route[]
      },
      loader: path.resolve(__dirname, 'loader.js').replace(/\\/g, '\\\\'),
      lazyLoad: options.lazyLoad
    }
    // 根据目录结构创建路由对象
    data.router.routes = createRoutes(options.files, {
      basePath: options.basePath,
      contextPath: options.contextPath
    })
    const imports = {
      hash,
      serialize
    }
    const templateFilePath = path.resolve(__dirname, '..', 'template', 'index.jsx')
    readFile(templateFilePath, 'utf8')
      .then(function (fileContent) {
        const template = _.template(fileContent, { imports })
        resolve({
          define: optimizeAsyncImport(
            template(Object.assign({}, data)),
            {
              contextPath: options.contextPath,
              settings: options.asyncImportOptimization
            }
          )
        })
      })
      .catch(function (e) {
        console.error(e)
      })
  })
}

export = async function (loader: webpack.loader.LoaderContext, options: AutoRouterOptions) {
  const dir = options.path || 'src'
  return walk(dir, {
    ignore: options.ignore || 'ar.ignore'
  })
    .then(function (result) {
      for (let item of result.dirs) {
        loader.addContextDependency(path.resolve(item))
      }
      return generateAutoRouters({
        basePath: '',
        files: result.files,
        contextPath: path.dirname(loader.resourcePath),
        asyncImportOptimization: options['chunk-name'],
        lazyLoad: options.lazyLoad
      })
    })
}

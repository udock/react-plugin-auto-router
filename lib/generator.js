"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var lodash_1 = __importDefault(require("lodash"));
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var pify_1 = __importDefault(require("pify"));
var hash_sum_1 = __importDefault(require("hash-sum"));
var serialize_javascript_1 = __importDefault(require("serialize-javascript"));
var readdir = pify_1.default(fs_1.default.readdir);
var readFile = pify_1.default(fs_1.default.readFile);
var REGEX_ASYNC_IMPORT = /import\('([^']+)'[^)]*\)/g;
var REGEX_MODULE_INDEX = /^(\/modules\/[\w-]+)*\/index\.(?:j|t)sx$/i;
var REGEX_VALIDATE_DIR = /^\/(modules\/[\w-]+\/)*(modules(\/[\w-]+|)|pages)$/i;
var REGEX_VALIDATE_PAGE = /^(\/modules\/[\w-]+)*\/pages\/[\w-]+\.(?:j|t)sx$/i;
var REGEX_FIX_MODULE_PATH = /modules\/([\w-]+)/g;
function fixPath(path) {
    return path.replace(/\/(modules|pages)\//g, '/');
}
function walk(parent, options, result, ignore) {
    return __awaiter(this, void 0, void 0, function () {
        var stat, file, promises_1;
        var _this = this;
        return __generator(this, function (_a) {
            options.base = options.base || parent.length;
            result = result || {
                files: {},
                dirs: []
            };
            stat = fs_1.default.statSync(parent);
            file = parent.substr(options.base).replace(/\\/g, '/');
            if (stat.isDirectory()) {
                if (!file || REGEX_VALIDATE_DIR.test(file)) {
                    if (file) {
                        result.dirs.push(parent);
                    }
                    ignore = ignore || fs_1.default.existsSync(path_1.default.join(parent, options.ignore));
                    promises_1 = [];
                    return [2 /*return*/, readdir(parent)
                            .then(function (entries) { return __awaiter(_this, void 0, void 0, function () {
                            var _i, entries_1, item, childPath;
                            return __generator(this, function (_a) {
                                for (_i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                                    item = entries_1[_i];
                                    childPath = path_1.default.join(parent, item);
                                    promises_1.push(walk(childPath, options, result, ignore));
                                }
                                return [2 /*return*/, Promise.all(promises_1).then(function () { return Promise.resolve(result); })];
                            });
                        }); })];
                }
            }
            else {
                if (REGEX_MODULE_INDEX.test(file)) {
                    file = fixPath(file.replace(/\/index(\.(?:j|t)sx)$/i, '$1'));
                }
                else if (REGEX_VALIDATE_PAGE.test(file)) {
                    file = fixPath(file);
                }
                else {
                    file = '';
                }
                if (file && !ignore && !/^\.(j|t)sx$/i.test(file)) {
                    result.files[file] = parent;
                    return [2 /*return*/, Promise.resolve(result)];
                }
            }
            return [2 /*return*/, Promise.resolve(result)];
        });
    });
}
/**
   * 删除 name: 'all' 的路由对象的name字段
   * 删除 name 末尾的index
   * @param {array} routes
   * @param {boolean} [isChild=false]
   * @returns
   */
function cleanChildrenRoutes(routes, isChild) {
    isChild = lodash_1.default.isUndefined(isChild) ? false : isChild;
    var start = -1;
    var routesIndex = [];
    routes.forEach(function (route) {
        if (/-index$/.test(route.name) || route.name === 'index') {
            // Save indexOf 'index' key in name
            var res = route.name.split('-');
            var s = res.indexOf('index');
            start = (start === -1 || s < start) ? s : start;
            routesIndex.push(res);
        }
    });
    routes.forEach(function (route) {
        route.path = (isChild) ? route.path.replace('/', '') : route.path;
        if (route.path.indexOf('?') > -1) {
            var names_1 = route.name.split('-');
            var paths_1 = route.path.split('/');
            if (!isChild) {
                paths_1.shift();
            } // clean first / for parents
            routesIndex.forEach(function (r) {
                var i = r.indexOf('index') - start; //  children names
                if (i < paths_1.length) {
                    for (var a = 0; a <= i; a++) {
                        if (a === i) {
                            paths_1[a] = paths_1[a].replace('?', '');
                        }
                        if (a < i && names_1[a] !== r[a]) {
                            break;
                        }
                    }
                }
            });
            route.path = (isChild ? '' : '/') + paths_1.join('/');
        }
        route.name = route.name.replace(/-index$/, '');
        if (route.children) {
            if (route.children.find(function (child) { return child.path === ''; })) {
                delete route.name;
            }
            route.children = cleanChildrenRoutes(route.children, true);
        }
    });
    return routes;
}
/**
 * 创建路由对象
 * @param {array} files
 * @param {string} srcDir
 */
function createRoutes(files, options) {
    var routes = [];
    Object.keys(files).sort().forEach(function (file) {
        var keys = file.replace(/\.(?:j|t)sx$/, '').replace(/\/{2,}/g, '/').split('/').slice(1);
        var componentFilePath = './' + path_1.default.relative(options.contextPath, files[file]).replace(/\\/g, '/');
        var rcFilePath = files[file].replace(/(\.(?:j|t)sx)$/, '.rc$1');
        if (fs_1.default.existsSync(rcFilePath)) {
            rcFilePath = componentFilePath.replace(/(\.(?:j|t)sx)$/, '.rc$1');
        }
        else {
            rcFilePath = undefined;
        }
        var route = {
            name: '',
            path: '',
            fullPath: '/' + keys.join('/').replace(/(^|\/)index$/i, ''),
            component: componentFilePath,
            rcFilePath: rcFilePath
        };
        var parent = routes;
        keys.forEach(function (key, i) {
            route.name = route.name ? route.name + '-' + key.replace('_', '') : key.replace('_', '');
            route.name += (key === '_') ? 'all' : '';
            var child = lodash_1.default.find(parent, { name: route.name });
            if (child) {
                if (!child.children) {
                    child.children = [];
                }
                parent = child.children;
                route.path = '';
            }
            else {
                if (key === 'index' && (i + 1) === keys.length) {
                    route.path += (i > 0 ? '' : '/');
                }
                else {
                    // if (key !== 'modules' && key !== 'pages')
                    route.path += '/' + (key === '_' ? '*' : key.replace('_', ':'));
                    if (key !== '_' && key.indexOf('_') !== -1) {
                        route.path += '?';
                    }
                }
            }
        });
        // Order Routes path
        parent.push(route);
        parent.sort(function (ra, rb) {
            var a = ra.path;
            var b = rb.path;
            if (!a.length || a === '/') {
                return 1;
            }
            if (!b.length || b === '/') {
                return -1;
            }
            a = a.toLowerCase();
            b = b.toLowerCase();
            var pa = 0;
            var pb = 0;
            if (~a.indexOf('*'))
                pa += 100000 + a.indexOf('*');
            if (~a.indexOf(':'))
                pa += 10000 - a.indexOf(':');
            if (~b.indexOf('*'))
                pb += 100000 + b.indexOf('*');
            if (~b.indexOf(':'))
                pb += 10000 - b.indexOf(':');
            if (pa > pb) {
                return 1;
            }
            else if (pa < pb) {
                return -1;
            }
            else {
                if (~a.indexOf(b)) {
                    return 1;
                }
                if (~b.indexOf(a)) {
                    return -1;
                }
                return a > b ? 1 : -1;
            }
        });
    });
    return cleanChildrenRoutes(routes);
}
function getChunkName(module, config) {
    module = path_1.default.relative('src', module).replace(/\\/g, '/');
    var pattern;
    for (var _i = 0, config_1 = config; _i < config_1.length; _i++) {
        var item = config_1[_i];
        if (lodash_1.default.isArray(item)) {
            for (var i = 1; i < item.length; i++) {
                pattern = item[i];
                if (lodash_1.default.isFunction(pattern)) {
                    if (pattern(module)) {
                        return item[0];
                    }
                }
                else if (lodash_1.default.isRegExp(pattern)) {
                    if (pattern.test(module)) {
                        return item[0];
                    }
                }
            }
        }
        else if (lodash_1.default.isFunction(item)) {
            var name_1 = item(module);
            if (lodash_1.default.isString(name_1) && name_1.length > 0) {
                return name_1;
            }
        }
    }
    console.warn('unnamed module:', module);
    return '';
}
// 异步引入合包优化处理
function optimizeAsyncImport(code, options) {
    if (options.settings) {
        var config_2 = lodash_1.default.map(options.settings, function (item) {
            if (lodash_1.default.isString(item)) {
                // 字符串类型的优化配置，形如 "baseRouterPath:maxDeep"，如 "2", "moduleName:2"
                var params = item.split(':');
                if (params.length === 1) {
                    if (parseInt(params[0]) + '' === params[0]) {
                        params[1] = params[0];
                        params[0] = '';
                    }
                    else {
                        params[1] = '0';
                    }
                }
                var baseRouterPath_1 = "src/" + lodash_1.default.trim(params[0]);
                var maxDeep = lodash_1.default.trim(params[1]);
                // 预处理
                baseRouterPath_1 = baseRouterPath_1
                    .replace(/\/+/g, '/') // 移除重复的'/'
                    .replace(/^\/?(.*)(?:([^/])|\/)$/, '/$1$2'); // 开头增加'/'，结尾去掉'/'
                // 将路由路径转换为文件路径目录, 如
                // /test/ -> modules/test/
                // /test/subtest/ -> modules/test/modules/subtest/
                var baseFilePathPath = baseRouterPath_1
                    .replace(/\//g, '/modules/') // 将所有路径分隔符替换为/modules/
                    .substr(1) + '/'; // 开头去掉'/', 结尾增加'/'
                // 规范化路由路径
                // /test/ -> test/
                // /test/subtest/ -> test/subtest/
                baseRouterPath_1 = baseRouterPath_1.substr(1).toLowerCase() + '/';
                var regExp_1 = new RegExp("^" + baseFilePathPath.replace(/\//, '\\/') + "((modules\\/[\\w-]+\\/){0," + maxDeep + "}).*$", 'i');
                return function (module) {
                    module = "modules/src/" + module;
                    if (regExp_1.test(module)) {
                        module = module
                            .replace(regExp_1, '$1')
                            .replace(REGEX_FIX_MODULE_PATH, '$1');
                        return ("" + baseRouterPath_1 + module + "pages").substr(4);
                    }
                };
            }
            return item;
        });
        return code.replace(REGEX_ASYNC_IMPORT, function (_, module) {
            var chunkName = getChunkName(path_1.default.resolve(options.contextPath, module), config_2);
            return "import('" + module + "' /* webpackChunkName: \"" + chunkName.toLowerCase() + "\" */)";
        });
    }
    return code;
}
var generateAutoRouters = function (options) {
    return new Promise(function (resolve, reject) {
        var data = {
            uniqBy: lodash_1.default.uniqBy,
            router: {
                base: '/',
                routes: []
            },
            loader: path_1.default.resolve(__dirname, 'loader.js').replace(/\\/g, '\\\\'),
            lazyLoad: options.lazyLoad
        };
        // 根据目录结构创建路由对象
        data.router.routes = createRoutes(options.files, {
            basePath: options.basePath,
            contextPath: options.contextPath
        });
        var imports = {
            hash: hash_sum_1.default,
            serialize: serialize_javascript_1.default
        };
        var templateFilePath = path_1.default.resolve(__dirname, '..', 'template', 'index.jsx');
        readFile(templateFilePath, 'utf8')
            .then(function (fileContent) {
            var template = lodash_1.default.template(fileContent, { imports: imports });
            resolve({
                define: optimizeAsyncImport(template(Object.assign({}, data)), {
                    contextPath: options.contextPath,
                    settings: options.asyncImportOptimization
                })
            });
        })
            .catch(function (e) {
            console.error(e);
        });
    });
};
module.exports = function (loader, options) {
    return __awaiter(this, void 0, void 0, function () {
        var dir;
        return __generator(this, function (_a) {
            dir = options.path || 'src';
            return [2 /*return*/, walk(dir, {
                    ignore: options.ignore || 'ar.ignore'
                })
                    .then(function (result) {
                    for (var _i = 0, _a = result.dirs; _i < _a.length; _i++) {
                        var item = _a[_i];
                        loader.addContextDependency(path_1.default.resolve(item));
                    }
                    return generateAutoRouters({
                        basePath: '',
                        files: result.files,
                        contextPath: path_1.default.dirname(loader.resourcePath),
                        asyncImportOptimization: options['chunk-name'],
                        lazyLoad: options.lazyLoad
                    });
                })];
        });
    });
};

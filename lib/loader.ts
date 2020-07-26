import path = require('path');
import webpack = require('webpack');
import generate from '@udock/react-plugin-auto-router/lib/generator'
const FRAMEWORK_NAMESPACE = 'udock'

export = function udockBootstrapLoader(this: webpack.loader.LoaderContext, content: string, map: any) {
  const configPath = path.resolve(`./src/${FRAMEWORK_NAMESPACE}.config.js`)
  delete require.cache[configPath]
  this.addDependency(configPath)
  let autoRouterConfig = {
    debug: false,
    ignore: 'ar.ignore',
    path: 'src', // 生成路由扫描的根目录
    'chunk-name': [
      '2'
    ]
  }

  try {
    const config = require(configPath)
    autoRouterConfig = config.plugins['auto-router']
  } catch (e) {
    console.log('\nframework config error:')
    this.callback(e)
    return
  }

  return generate(this, autoRouterConfig).then((result: any) => {
    if (autoRouterConfig.debug) {
      setTimeout(() => {
        console.log('======== auto-router =========')
        console.log(result.define)
        console.log('======== =========== =========')
      }, 1000)
    }
    return result.define
  })
}

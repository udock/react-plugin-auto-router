<% if (lazyLoad !== '@loadable/component') { %>
import React, { lazy, Suspense } from 'react'
<% } else { %>
import React from 'react'
import loadable from '@loadable/component'
<% } %>
import { Route } from 'react-router-dom'

let routes
export default (options) => {
  if (routes) return routes

<% if (lazyLoad !== '@loadable/component') { %>
  function load(module, config, warp) {
    let AsyncComponent = lazy(module)

    if (warp) {
      AsyncComponent = warp(AsyncComponent)
    }

    return () => (
      <Suspense fallback={config?.loading || options?.loading}>
        <AsyncComponent {...config?.props} ></AsyncComponent>
      </Suspense>
    )
  }
<% } else { %>
  function load(module, config, warp) {
    let AsyncComponent = loadable(module, {
      fallback: config?.loading || options?.loading
    })

    if (warp) {
      AsyncComponent = warp(AsyncComponent)
    }

    return () => <AsyncComponent {...config?.props} ></AsyncComponent>
  }
<% } %>
<%
  var nestRouter = []
  var _components = []
  function recursiveRoutes (routes, tab, components) {
    var res = ''
    routes.forEach(function (route, i) {
      route._name = '_' + hash(route.component)
      res += tab
      res += '<Route path="' + route.fullPath + '"' + (route.children ? '' : ' exact') + ' component={ ' + route._name + ' } ' + (route.rcFilePath ? '{ ...' + route._name +'_rc.overide } ' : '') + '/>\n'
      res += (i + 1 === routes.length ? '' : '\n')

      if (route.children) {
        nestRouter.push(
          (route.rcFilePath ? '  const ' + route._name + "_rc = require('" + route.rcFilePath + "').default\n" : '') +
          '  const _' + hash(route.component) + " = load(\n  () => import('" + route.component + "'" + ' /* webpackChunkName: "modules/' + route.name + '" */),\n    ' +
          (route.rcFilePath ? route._name + '_rc.props' : 'undefined') + ',\n' +
          '    AsyncComponent => () => <AsyncComponent routes={(\n      <>\n' +
          recursiveRoutes(routes[i].children, '        ', components) +
          '      </>)}\n    />\n  )\n'
        )
      } else {
        components.push({ ...route })
      }
    })
    return res
  }
  var _routes = recursiveRoutes(router.routes, '      ', _components)
  uniqBy(_components, '_name').forEach(function (route) { %><%
  if (route.rcFilePath) {%>
  const <%= route._name %>_rc = require('<%= route.rcFilePath %>').default<%}%>
  const <%= route._name %> = load(() => import('<%= route.component %>' /* webpackChunkName: "modules/<%= route.name %>" */)<%= route.rcFilePath ? ', ' + route._name + '_rc' : '' %>)
<%   }) %>

<%= nestRouter.join('\n') %>

  routes = (
    <>
<%= _routes %>
    </>
  )

  return routes
}

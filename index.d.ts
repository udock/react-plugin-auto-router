import React from 'react'

export type AutoRouterOptions<T extends React.Component> = {
  loading: JSX.Element | T
}

declare const genAutoRoutes = (options: AutoRouterOptions) => JSX.Element

export default genAutoRoutes

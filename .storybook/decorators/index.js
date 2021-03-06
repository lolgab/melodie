'use strict'

import HRefSink from './HRefSink.svelte'

export const hrefSinkDecorator = storyFn => ({
  Component: HRefSink,
  props: { ...storyFn() }
})

export { default as ipcRendererMock } from './ipcRendererMock'

'use strict'

import { action } from '@storybook/addon-actions'
import Album from './Album.stories.svelte'
import { hrefSinkDecorator } from '../../../.storybook/decorators'

export default {
  title: 'Components/Album',
  excludeStories: /.*Data$/,
  decorators: [hrefSinkDecorator]
}

export const albumData = {
  name: 'Diamonds on the inside',
  linked: ['Ben Harper', 'The Innocent Criminals'],
  media: './cover.jpg'
}

export const manyArtistsData = {
  name: 'Diamonds on the inside',
  linked: ['Muse', 'Perl Jam', 'Joe Satriani', 'Avenged Sevenfold'],
  media: './cover.jpg'
}

export const actionsData = {
  play: action('on album play'),
  enqueue: action('on album enqueue')
}

export const Default = () => ({
  Component: Album,
  props: {
    src: albumData
  },
  on: actionsData
})

export const ManyArtists = () => ({
  Component: Album,
  props: {
    src: manyArtistsData
  },
  on: actionsData
})

export const NoArtist = () => ({
  Component: Album,
  props: {
    src: {
      ...albumData,
      linked: []
    }
  },
  on: actionsData
})

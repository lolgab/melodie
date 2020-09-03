'use strict'

import { screen, render, fireEvent } from '@testing-library/svelte'
import html from 'svelte-htm'
import { BehaviorSubject } from 'rxjs'
import { replace } from 'svelte-spa-router'
import faker from 'faker'
import playlistRoute from './[id].svelte'
import {
  playlists as mockedPlaylists,
  changes,
  removals,
  load,
  remove
} from '../../stores/playlists'
import { add } from '../../stores/track-queue'
import { translate, sleep, addRefs } from '../../tests'

jest.mock('svelte-spa-router')
jest.mock('../../stores/track-queue', () => ({
  add: jest.fn(),
  current: {
    subscribe: () => ({ unsubscribe: () => {} })
  }
}))
jest.mock('../../stores/playlists', () => {
  const { Subject } = require('rxjs')
  return {
    load: jest.fn(),
    changes: new Subject(),
    removals: new Subject(),
    moveTrack: jest.fn(),
    removeTrack: jest.fn(),
    remove: jest.fn(),
    playlists: {
      subscribe: () => ({ unsubscribe: () => {} })
    }
  }
})

describe('playlist details route', () => {
  const playlist = {
    id: faker.random.number(),
    name: faker.commerce.productName(),
    refs: [],
    media: null,
    tracks: [
      {
        id: faker.random.uuid(),
        tags: {
          title: faker.commerce.productName(),
          artists: [faker.name.findName()],
          album: faker.lorem.words(),
          duration: 265
        }
      },
      {
        id: faker.random.uuid(),
        tags: {
          title: faker.commerce.productName(),
          artists: [faker.name.findName()],
          album: faker.lorem.words(),
          duration: 270
        }
      },
      {
        id: faker.random.uuid(),
        tags: {
          title: faker.commerce.productName(),
          artists: [faker.name.findName()],
          album: faker.lorem.words(),
          duration: 281
        }
      }
    ].map(addRefs)
  }

  function expectDisplayedTracks() {
    for (const track of playlist.tracks) {
      expect(screen.queryByText(track.tags.artists[0])).toBeInTheDocument()
      expect(screen.queryByText(track.tags.album)).toBeInTheDocument()
      expect(screen.queryByText(track.tags.title)).toBeInTheDocument()
    }
  }

  beforeEach(() => {
    const playlists = new BehaviorSubject([playlist])
    mockedPlaylists.subscribe = playlists.subscribe.bind(playlists)
    jest.resetAllMocks()
  })

  it('redirects to playlist list on unknown playlist', async () => {
    load.mockResolvedValueOnce(null)

    render(html`<${playlistRoute} params=${{ id: playlist.id }} />`)
    await sleep()

    expect(load).toHaveBeenCalledWith(playlist.id)
    expect(replace).toHaveBeenCalledWith('/playlist')
  })

  describe('given a playlist', () => {
    beforeEach(async () => {
      location.hash = `#/playlist/${playlist.id}`
      load.mockResolvedValueOnce(playlist)
      render(html`<${playlistRoute} params=${{ id: playlist.id }} />`)
      await sleep()
    })

    it('displays playlist name', async () => {
      expect(screen.queryByText(playlist.name)).toBeInTheDocument()
      expect(load).toHaveBeenCalledWith(playlist.id)
    })

    it('loads tracks and display them', async () => {
      expect(load).toHaveBeenCalledWith(playlist.id)
      expectDisplayedTracks()
      expect(replace).not.toHaveBeenCalled()
    })

    it('enqueues whole playlist', async () => {
      await fireEvent.click(screen.getByText(translate('enqueue all')))
      await sleep()

      expect(add).toHaveBeenCalledWith(playlist.tracks)
      expect(add).toHaveBeenCalledTimes(1)
      expect(location.hash).toEqual(`#/playlist/${playlist.id}`)
    })

    it('plays whole playlist', async () => {
      await fireEvent.click(screen.getByText(translate('play all')))
      await sleep()

      expect(add).toHaveBeenCalledWith(playlist.tracks, true)
      expect(add).toHaveBeenCalledTimes(1)
      expect(location.hash).toEqual(`#/playlist/${playlist.id}`)
    })

    it('can cancel playlist deletion', async () => {
      await fireEvent.click(screen.queryByText(translate('delete playlist')))

      expect(screen.queryByText(translate('playlist deletion'))).toBeVisible()
      await fireEvent.click(screen.queryByText('cancel'))
      await sleep()

      expect(
        screen.queryByText(translate('playlist deletion'))
      ).not.toBeVisible()
      expect(remove).not.toHaveBeenCalled()
    })

    it('deletes the whole playlist', async () => {
      await fireEvent.click(screen.queryByText(translate('delete playlist')))

      expect(screen.queryByText(translate('playlist deletion'))).toBeVisible()
      await fireEvent.click(screen.queryByText('done'))
      await sleep()

      expect(remove).toHaveBeenCalledWith(playlist)
    })

    it('updates on playlist change', async () => {
      load.mockReset()

      const newName = faker.commerce.productName()
      changes.next({ ...playlist, name: newName })
      await sleep()

      expect(screen.queryByText(playlist.name)).toBeFalsy()
      expect(screen.getByText(newName)).toBeInTheDocument()
      expect(load).not.toHaveBeenCalled()
    })

    it('ignores changes on other playlist', async () => {
      load.mockReset()

      changes.next({
        ...playlist,
        id: faker.random.number(),
        tracks: undefined
      })
      await sleep()

      expectDisplayedTracks()
      expect(load).not.toHaveBeenCalled()
    })

    it('reloads tracks on playlist change', async () => {
      load.mockReset().mockResolvedValueOnce(playlist)

      changes.next({ ...playlist, tracks: undefined })
      await sleep()

      expect(load).toHaveBeenCalledWith(playlist.id)
      expectDisplayedTracks()
      expect(load).toHaveBeenCalledTimes(1)
    })

    it('redirects to playlist list on removal', async () => {
      removals.next(playlist.id)

      expect(replace).toHaveBeenCalledWith('/playlist')
    })

    it('ignores other playlist removals', async () => {
      removals.next(faker.random.number())

      expect(replace).not.toHaveBeenCalled()
    })
  })
})

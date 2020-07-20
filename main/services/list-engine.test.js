'use strict'

const faker = require('faker')
const fs = require('fs-extra')
const { join } = require('path')
const os = require('os')
const { artistsModel } = require('../models/artists')
const { albumsModel } = require('../models/albums')
const { tracksModel } = require('../models/tracks')
const { settingsModel } = require('../models/settings')
const engine = require('./list-engine')
const { hash, broadcast } = require('../utils')

jest.mock('../models/artists')
jest.mock('../models/albums')
jest.mock('../models/tracks')
jest.mock('../models/settings')
jest.mock('../utils/electron-remote')
jest.mock('electron', () => ({ app: { getAppPath: jest.fn() } }))

function addId(obj) {
  return { ...obj, id: hash(obj.name) }
}

let dbFile

describe('Lists Engine', () => {
  beforeAll(async () => {
    dbFile = join(await fs.mkdtemp(join(os.tmpdir(), 'melodie-')), 'db.sqlite3')
  })

  beforeEach(() => {
    jest.clearAllMocks()
    albumsModel.list.mockResolvedValue([])
    albumsModel.save.mockResolvedValue()
    artistsModel.list.mockResolvedValue([])
    artistsModel.save.mockResolvedValue()
    tracksModel.list.mockResolvedValue([])
    tracksModel.save.mockResolvedValue([])
  })

  describe('init', () => {
    it('initializes properly', async () => {
      await engine.init(dbFile)

      expect(settingsModel.init).toHaveBeenCalled()
      expect(albumsModel.init).toHaveBeenCalled()
      expect(artistsModel.init).toHaveBeenCalled()
      expect(tracksModel.init).toHaveBeenCalled()
    })
  })

  describe('reset', () => {
    it('resets properly', async () => {
      await engine.reset()

      expect(settingsModel.reset).toHaveBeenCalled()
      expect(albumsModel.reset).toHaveBeenCalled()
      expect(artistsModel.reset).toHaveBeenCalled()
      expect(tracksModel.reset).toHaveBeenCalled()
      expect(settingsModel.init).toHaveBeenCalled()
      expect(albumsModel.init).toHaveBeenCalled()
      expect(artistsModel.init).toHaveBeenCalled()
      expect(tracksModel.init).toHaveBeenCalled()
    })
  })

  describe('add', () => {
    it('stores track with multiple artists', async () => {
      const path = faker.system.fileName()
      const artistNames = [faker.name.findName(), faker.name.findName()]
      const artists = artistNames.map(name =>
        addId({
          name,
          trackIds: [hash(path)]
        })
      )
      const tracks = [{ id: hash(path), path, tags: { artists: artistNames } }]
      artistsModel.save.mockResolvedValueOnce({
        saved: artists,
        removedIds: []
      })

      await engine.add(tracks)

      expect(tracksModel.save).toHaveBeenCalledWith(tracks)
      expect(tracksModel.save).toHaveBeenCalledTimes(1)
      expect(artistsModel.save).toHaveBeenCalledWith(artists)
      expect(artistsModel.save).toHaveBeenCalledTimes(1)
      for (const artist of artists) {
        expect(broadcast).toHaveBeenCalledWith('artist-change', artist)
      }
      expect(broadcast).toHaveBeenCalledTimes(artists.length)
    })

    it('stores track with album', async () => {
      const name = faker.commerce.productName()
      const path = faker.system.fileName()
      const album = addId({
        name,
        trackIds: [hash(path)]
      })
      const tracks = [{ id: hash(path), path, tags: { album: name } }]
      albumsModel.save.mockResolvedValueOnce({
        saved: [album],
        removedIds: []
      })

      await engine.add(tracks)

      expect(tracksModel.save).toHaveBeenCalledWith(tracks)
      expect(tracksModel.save).toHaveBeenCalledTimes(1)
      expect(albumsModel.save).toHaveBeenCalledWith([album])
      expect(albumsModel.save).toHaveBeenCalledTimes(1)
      expect(broadcast).toHaveBeenCalledWith('album-change', album)
      expect(broadcast).toHaveBeenCalledTimes(1)
    })

    it('stores track with cover', async () => {
      const name = faker.commerce.productName()
      const media = faker.image.image()
      const path = faker.system.fileName()
      const album = addId({
        name,
        media,
        trackIds: [hash(path)]
      })
      const tracks = [
        {
          id: hash(path),
          path,
          tags: { album: name, artists: [] },
          media
        }
      ]
      albumsModel.save.mockResolvedValueOnce({
        saved: [album],
        removedIds: []
      })

      await engine.add(tracks)

      expect(tracksModel.save).toHaveBeenCalledWith(tracks)
      expect(tracksModel.save).toHaveBeenCalledTimes(1)
      expect(albumsModel.save).toHaveBeenCalledWith([album])
      expect(albumsModel.save).toHaveBeenCalledTimes(1)
      expect(broadcast).toHaveBeenCalledWith('album-change', album)
      expect(broadcast).toHaveBeenCalledTimes(1)
    })

    it('skip existing albums', async () => {
      const name = faker.commerce.productName()
      const track1 = {
        path: faker.system.fileName(),
        tags: { album: name }
      }
      track1.id = hash(track1.path)
      const track2 = {
        path: faker.system.fileName(),
        tags: { album: name }
      }
      track2.id = hash(track2.path)
      const track3 = {
        path: faker.system.fileName(),
        tags: { album: name }
      }
      track3.id = hash(track3.path)

      const album = addId({
        name,
        trackIds: [track1.id, track2.id, track3.id]
      })
      const tracks = [track1, track2, track3]
      albumsModel.save.mockResolvedValueOnce({
        saved: [album],
        removedIds: []
      })

      await engine.add(tracks)

      expect(tracksModel.save).toHaveBeenCalledWith(tracks)
      expect(tracksModel.save).toHaveBeenCalledTimes(1)
      expect(albumsModel.save).toHaveBeenCalledWith([album])
      expect(albumsModel.save).toHaveBeenCalledTimes(1)
      expect(broadcast).toHaveBeenCalledWith('album-change', album)
      expect(broadcast).toHaveBeenCalledTimes(1)
    })

    it('skip existing artists', async () => {
      const artist1 = faker.name.findName()
      const artist2 = faker.name.findName()
      const artist3 = faker.name.findName()
      const track1 = {
        path: faker.system.fileName(),
        tags: { artists: [artist1, artist2] }
      }
      track1.id = hash(track1.path)
      const track2 = {
        path: faker.system.fileName(),
        tags: { artists: [artist2, artist3] }
      }
      track2.id = hash(track2.path)
      const track3 = {
        path: faker.system.fileName(),
        tags: { artists: [artist3] }
      }
      track3.id = hash(track3.path)

      const artists = [
        addId({
          name: artist1,
          trackIds: [track1.id]
        }),
        addId({
          name: artist2,
          trackIds: [track1.id, track2.id]
        }),
        addId({
          name: artist3,
          trackIds: [track2.id, track3.id]
        })
      ]
      const tracks = [track1, track2, track3]
      artistsModel.save.mockResolvedValueOnce({
        saved: artists,
        removedIds: []
      })

      await engine.add(tracks)

      expect(tracksModel.save).toHaveBeenCalledWith(tracks)
      expect(tracksModel.save).toHaveBeenCalledTimes(1)
      expect(artistsModel.save).toHaveBeenCalledWith(artists)
      expect(artistsModel.save).toHaveBeenCalledTimes(1)
      for (const artist of artists) {
        expect(broadcast).toHaveBeenCalledWith('artist-change', artist)
      }
      expect(broadcast).toHaveBeenCalledTimes(artists.length)
    })

    it('detects album changes for existing tracks', async () => {
      const oldName = faker.commerce.productName()
      const updatedName = faker.commerce.productName()
      const newName = faker.commerce.productName()

      const track1 = {
        path: faker.system.fileName(),
        tags: { album: newName }
      }
      track1.id = hash(track1.path)
      const track2 = {
        path: faker.system.fileName(),
        tags: { album: newName }
      }
      track2.id = hash(track2.path)
      const track3 = {
        path: faker.system.fileName(),
        tags: { album: newName }
      }
      track3.id = hash(track3.path)
      const track4 = {
        path: faker.system.fileName(),
        tags: { album: updatedName }
      }
      track4.id = hash(track3.path)

      tracksModel.save.mockResolvedValueOnce([
        { id: track1.id, tags: { album: oldName } },
        { id: track2.id, tags: { album: oldName } },
        { id: track3.id, tags: { album: updatedName } }
      ])
      const tracks = [track1, track2, track3, track4]
      const oldAlbum = addId({
        name: oldName,
        trackIds: [],
        removedTrackIds: [track1.id, track2.id]
      })
      const updatedAlbum = addId({
        name: updatedName,
        removedTrackIds: [track3.id],
        trackIds: [track4.id]
      })
      const newAlbum = addId({
        name: newName,
        trackIds: [track1.id, track2.id, track3.id]
      })
      albumsModel.save.mockResolvedValueOnce({
        saved: [oldAlbum, updatedAlbum, newAlbum],
        removedIds: []
      })

      await engine.add(tracks)

      expect(tracksModel.save).toHaveBeenCalledWith(tracks)
      expect(tracksModel.save).toHaveBeenCalledTimes(1)
      expect(albumsModel.save).toHaveBeenCalledWith([
        newAlbum,
        oldAlbum,
        updatedAlbum
      ])
      expect(albumsModel.save).toHaveBeenCalledTimes(1)
      expect(broadcast).toHaveBeenCalledWith('album-change', oldAlbum)
      expect(broadcast).toHaveBeenCalledWith('album-change', updatedAlbum)
      expect(broadcast).toHaveBeenCalledWith('album-change', newAlbum)
      expect(broadcast).toHaveBeenCalledTimes(3)
    })

    it('detects artist changes for existing tracks', async () => {
      const oldName = faker.name.findName()
      const updatedName = faker.name.findName()
      const newName = faker.name.findName()

      const track1 = {
        path: faker.system.fileName(),
        tags: { artists: [newName, updatedName] }
      }
      track1.id = hash(track1.path)
      const track2 = {
        path: faker.system.fileName(),
        tags: { artists: [newName] }
      }
      track2.id = hash(track2.path)

      tracksModel.save.mockResolvedValueOnce([
        { id: track1.id, tags: { artists: [oldName] } },
        { id: track2.id, tags: { artists: [oldName, updatedName] } }
      ])

      const oldArtist = addId({
        name: oldName,
        trackIds: [],
        removedTrackIds: [track1.id, track2.id]
      })
      const updatedArtist = addId({
        name: updatedName,
        removedTrackIds: [track2.id],
        trackIds: [track1.id]
      })
      const newArtist = addId({
        name: newName,
        trackIds: [track1.id, track2.id]
      })
      artistsModel.save.mockResolvedValueOnce({
        saved: [oldArtist, updatedArtist, newArtist],
        removedIds: []
      })

      await engine.add([track1, track2])

      expect(artistsModel.save).toHaveBeenCalledWith([
        newArtist,
        updatedArtist,
        oldArtist
      ])
      expect(artistsModel.save).toHaveBeenCalledTimes(1)
      expect(broadcast).toHaveBeenCalledWith('artist-change', oldArtist)
      expect(broadcast).toHaveBeenCalledWith('artist-change', updatedArtist)
      expect(broadcast).toHaveBeenCalledWith('artist-change', newArtist)
      expect(broadcast).toHaveBeenCalledTimes(3)
    })
  })

  describe('remove', () => {
    it('updates album', async () => {
      const name = faker.commerce.productName()
      const path = faker.system.fileName()
      const album = addId({
        name,
        removedTrackIds: [hash(path)],
        trackIds: []
      })
      const tracks = [{ id: hash(path), path, tags: { album: name } }]
      const trackIds = tracks.map(({ id }) => id)
      tracksModel.removeByIds.mockResolvedValueOnce(tracks)
      albumsModel.save.mockResolvedValueOnce({
        saved: [],
        removedIds: [album.id]
      })

      await engine.remove(trackIds)

      expect(tracksModel.removeByIds).toHaveBeenCalledWith(trackIds)
      expect(tracksModel.removeByIds).toHaveBeenCalledTimes(1)
      expect(albumsModel.save).toHaveBeenCalledWith([album])
      expect(albumsModel.save).toHaveBeenCalledTimes(1)
      expect(broadcast).toHaveBeenCalledWith('album-removal', album.id)
      expect(broadcast).toHaveBeenCalledTimes(1)
    })

    it('updates artists', async () => {
      const path = faker.system.fileName()
      const artistNames = [faker.name.findName(), faker.name.findName()]
      const artists = artistNames.map(name =>
        addId({
          name,
          removedTrackIds: [hash(path)],
          trackIds: []
        })
      )
      const tracks = [{ id: hash(path), path, tags: { artists: artistNames } }]
      const trackIds = tracks.map(({ id }) => id)
      tracksModel.removeByIds.mockResolvedValueOnce(tracks)
      artistsModel.save.mockResolvedValueOnce({
        saved: [],
        removedIds: artists.map(({ id }) => id)
      })

      await engine.remove(trackIds)

      expect(tracksModel.removeByIds).toHaveBeenCalledWith(trackIds)
      expect(tracksModel.removeByIds).toHaveBeenCalledTimes(1)
      expect(artistsModel.save).toHaveBeenCalledWith(artists)
      expect(artistsModel.save).toHaveBeenCalledTimes(1)
      for (const { id } of artists) {
        expect(broadcast).toHaveBeenCalledWith('artist-removal', id)
      }
      expect(broadcast).toHaveBeenCalledTimes(artists.length)
    })
  })

  describe('list', () => {
    it('returns all artists', async () => {
      const artists = [
        {
          name: faker.name.findName()
        },
        {
          name: faker.name.findName()
        }
      ].map(addId)
      artistsModel.list.mockResolvedValueOnce(artists)
      expect(await engine.listArtists()).toEqual(artists)
    })
  })

  it('returns all albums', async () => {
    const albums = [
      {
        name: faker.commerce.productName(),
        media: faker.image.image()
      },
      {
        name: faker.commerce.productName(),
        media: faker.image.image()
      }
    ].map(addId)
    albumsModel.list.mockResolvedValueOnce(albums)
    expect(await engine.listAlbums()).toEqual(albums)
  })
})

describe('getById', () => {
  it('returns tracks by list, order by track number, single disc', async () => {
    const track1 = {
      path: faker.system.fileName(),
      tags: { track: { no: 3 }, disk: {} }
    }
    track1.id = hash(track1.path)
    const track2 = {
      path: faker.system.fileName(),
      tags: { track: { no: undefined }, disk: {} }
    }
    track2.id = hash(track2.path)
    const track3 = {
      path: faker.system.fileName(),
      tags: { track: { no: 1 }, disk: {} }
    }
    track3.id = hash(track3.path)
    const name = faker.commerce.productName()
    const album = {
      id: hash(name),
      name,
      trackIds: [track1.id, track2.id, track3.id]
    }

    tracksModel.getByIds.mockResolvedValueOnce([track1, track2, track3])
    expect(await engine.listTracksOf(album)).toEqual([track3, track1, track2])
  })

  it('returns tracks by list, order by track number, multiple discs', async () => {
    const track1 = {
      path: faker.system.fileName(),
      tags: { track: { no: 3 }, disk: { no: 2 } }
    }
    track1.id = hash(track1.path)
    const track2 = {
      path: faker.system.fileName(),
      tags: { track: { no: 1 }, disk: { no: 1 } }
    }
    track2.id = hash(track2.path)
    const track3 = {
      path: faker.system.fileName(),
      tags: { track: { no: 2 }, disk: { no: undefined } }
    }
    track3.id = hash(track3.path)
    const track4 = {
      path: faker.system.fileName(),
      tags: { track: { no: 1 }, disk: { no: 2 } }
    }
    track4.id = hash(track4.path)

    const name = faker.commerce.productName()
    const album = {
      id: hash(name),
      name,
      trackIds: [track1.id, track2.id, track3.id, track4.id]
    }

    tracksModel.getByIds.mockResolvedValueOnce([track1, track2, track3, track4])
    expect(await engine.listTracksOf(album)).toEqual([
      track2,
      track4,
      track1,
      track3
    ])
  })

  it('returns tracks by list, order by list rank', async () => {
    const track1 = {
      path: faker.system.fileName(),
      tags: { track: { no: 3 }, disk: { no: 2 } }
    }
    track1.id = hash(track1.path)
    const track2 = {
      path: faker.system.fileName(),
      tags: { track: { no: 1 }, disk: { no: 1 } }
    }
    track2.id = hash(track2.path)
    const track3 = {
      path: faker.system.fileName(),
      tags: { track: { no: 2 }, disk: { no: undefined } }
    }

    const name = faker.commerce.productName()
    const album = {
      id: hash(name),
      name,
      trackIds: [track3.id, track2.id, track1.id]
    }

    tracksModel.getByIds.mockResolvedValueOnce([track1, track2, track3])
    expect(await engine.listTracksOf(album, 'rank')).toEqual([
      track3,
      track2,
      track1
    ])
  })
})

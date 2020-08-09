'use strict'

const faker = require('faker')
const electron = require('electron')
const os = require('os')
const fs = require('fs-extra')
const { constants } = require('fs')
const { resolve } = require('path')
const { artistsModel, albumsModel, tracksModel } = require('../models')
const { broadcast } = require('../utils')
const manager = require('./media-manager')
const discogs = require('../providers/discogs')
const audiodb = require('../providers/audiodb')

jest.mock('../providers/audiodb')
jest.mock('../providers/discogs')
jest.mock('../models/artists')
jest.mock('../models/albums')
jest.mock('../models/tracks')
jest.mock('../utils/electron-remote')
jest.mock('electron', () => ({ app: { getPath: jest.fn() } }))

describe('Media manager', () => {
  it('returns artwork for artist', async () => {
    const artworks = [
      {
        full:
          'https://www.theaudiodb.com/images/media/artist/thumb/uxrqxy1347913147.jpg',
        preview:
          'https://www.theaudiodb.com/images/media/artist/thumb/uxrqxy1347913147.jpg/preview'
      },
      {
        full:
          'https://www.theaudiodb.com/images/media/artist/fanart/spvryu1347980801.jpg',
        preview:
          'https://www.theaudiodb.com/images/media/artist/fanart/spvryu1347980801.jpg/preview'
      },
      {
        full:
          'https://img.discogs.com/RLkA5Qmo6_eNpWGjioaI4bJZUB4=/600x600/smart/filters:strip_icc():format(jpeg):mode_rgb():quality(90)/discogs-images/A-29735-1591800654-2186.jpeg.jpg',
        preview:
          'https://img.discogs.com/wT8s4e2BCPOcCFoLhpw7PnsHLSs=/150x150/smart/filters:strip_icc():format(jpeg):mode_rgb():quality(40)/discogs-images/A-29735-1591800654-2186.jpeg.jpg'
      }
    ]
    audiodb.findArtistArtwork.mockResolvedValueOnce(artworks.slice(0, 2))
    discogs.findArtistArtwork.mockResolvedValueOnce(artworks.slice(2))

    expect(await manager.findForArtist('coldplay')).toEqual(artworks)
  })

  it('returns cover for album', async () => {
    const covers = [
      {
        full:
          'https://www.theaudiodb.com/images/media/album/thumb/swxywp1367234202.jpg',
        preview:
          'https://www.theaudiodb.com/images/media/album/thumb/swxywp1367234202.jpg/preview'
      },
      {
        full:
          'https://img.discogs.com/eTfvDOHIvDIHuMFHv28H6_MG-b0=/fit-in/500x505/filters:strip_icc():format(jpeg):mode_rgb():quality(90)/discogs-images/R-3069838-1466508617-4579.jpeg.jpg',
        preview:
          'https://img.discogs.com/2uuQhoo6sVjVcm_5dzdRVwanEYg=/fit-in/150x150/filters:strip_icc():format(jpeg):mode_rgb():quality(40)/discogs-images/R-3069838-1466508617-4579.jpeg.jpg'
      },
      {
        full:
          'https://img.discogs.com/hp9V11cwfD4e4lWid6zV5j8P-g8=/fit-in/557x559/filters:strip_icc():format(jpeg):mode_rgb():quality(90)/discogs-images/R-5589468-1397410589-8616.jpeg.jpg',
        preview:
          'https://img.discogs.com/767xqHjX9er5ybtwo_bz1UNxOHc=/fit-in/150x150/filters:strip_icc():format(jpeg):mode_rgb():quality(40)/discogs-images/R-5589468-1397410589-8616.jpeg.jpg'
      },
      {
        full:
          'https://img.discogs.com/QpNOv7TPg9VIkdbCYKqEtNbCN04=/fit-in/600x595/filters:strip_icc():format(jpeg):mode_rgb():quality(90)/discogs-images/R-2898241-1306263310.jpeg.jpg',
        preview:
          'https://img.discogs.com/ozha3Wu7e3rmGPo26SxWfEHEa5U=/fit-in/150x150/filters:strip_icc():format(jpeg):mode_rgb():quality(40)/discogs-images/R-2898241-1306263310.jpeg.jpg'
      }
    ]
    audiodb.findAlbumCover.mockResolvedValueOnce(covers.slice(0, 1))
    discogs.findAlbumCover.mockResolvedValueOnce(covers.slice(1))

    expect(await manager.findForAlbum('Parachutes')).toEqual(covers)
  })

  describe('saveForAlbum()', () => {
    const name = faker.commerce.productName()
    const track1 = {
      id: faker.random.number({ min: 9999 }),
      path: resolve(os.tmpdir(), name, faker.system.fileName()),
      media: null,
      tags: {}
    }
    const track2 = {
      id: faker.random.number({ min: 9999 }),
      path: resolve(os.tmpdir(), name, faker.system.fileName()),
      media: null,
      tags: {}
    }
    const album = {
      id: faker.random.number({ min: 9999 }),
      name,
      media: null,
      linked: [],
      trackIds: [track1.id, track2.id]
    }

    describe.each([
      [
        'remote',
        'https://www.theaudiodb.com/images/media/album/thumb/swxywp1367234202.jpg',
        resolve(os.tmpdir(), name, `cover.jpeg`)
      ],
      [
        'local',
        resolve(__dirname, '..', '..', 'fixtures', 'cover.jpg'),
        resolve(os.tmpdir(), name, 'cover.jpg')
      ]
    ])('given a %s media', (unused, source, media) => {
      beforeEach(async () => {
        jest.resetAllMocks()
        electron.app.getPath.mockReturnValue(os.tmpdir())
        try {
          await fs.unlink(media)
        } catch (err) {
          // ignore missing files
        }
      })
      it('downloads and save album cover', async () => {
        const savedAlbum = { ...album, media }
        const savedTrack1 = { ...track1, media }
        const savedTrack2 = { ...track2, media }
        albumsModel.getById.mockResolvedValueOnce(album)
        tracksModel.getByIds.mockResolvedValueOnce([track1, track2])
        albumsModel.save.mockResolvedValueOnce({ saved: [savedAlbum] })
        tracksModel.save.mockResolvedValueOnce({
          saved: [savedTrack1, savedTrack2]
        })

        await manager.saveForAlbum(album.id, source)

        expect(albumsModel.save).toHaveBeenCalledWith(savedAlbum)
        expect(albumsModel.save).toHaveBeenCalledTimes(1)
        expect(tracksModel.save).toHaveBeenCalledWith([
          savedTrack1,
          savedTrack2
        ])
        expect(tracksModel.save).toHaveBeenCalledTimes(1)
        expect(await fs.access(media, constants.R_OK))
        expect(broadcast).toHaveBeenNthCalledWith(1, 'album-change', album)
        expect(broadcast).toHaveBeenNthCalledWith(2, 'album-change', savedAlbum)
        expect(broadcast).toHaveBeenNthCalledWith(3, 'track-change', track1)
        expect(broadcast).toHaveBeenNthCalledWith(
          4,
          'track-change',
          savedTrack1
        )
        expect(broadcast).toHaveBeenNthCalledWith(5, 'track-change', track2)
        expect(broadcast).toHaveBeenNthCalledWith(
          6,
          'track-change',
          savedTrack2
        )
        expect(broadcast).toHaveBeenCalledTimes(6)
      })

      it('downloads and replace album cover', async () => {
        const savedAlbum = { ...album, media }
        const savedTrack1 = { ...track1, media }
        const savedTrack2 = { ...track2, media }
        albumsModel.getById.mockResolvedValueOnce(savedAlbum)
        tracksModel.getByIds.mockResolvedValueOnce([track1, track2])
        albumsModel.save.mockResolvedValueOnce({ saved: [savedAlbum] })
        tracksModel.save.mockResolvedValueOnce({
          saved: [savedTrack1, savedTrack2]
        })
        const oldContent = 'old content'
        await fs.ensureFile(media)
        await fs.writeFile(media, oldContent)

        await manager.saveForAlbum(album.id, source)

        expect(albumsModel.save).toHaveBeenCalledWith(savedAlbum)
        expect(albumsModel.save).toHaveBeenCalledTimes(1)
        expect(await fs.access(media, constants.R_OK))
        const content = await fs.readFile(media, 'utf8')
        expect(content).not.toEqual(oldContent)
        expect(content).toBeDefined()
        expect(broadcast).toHaveBeenNthCalledWith(1, 'album-change', album)
        expect(broadcast).toHaveBeenNthCalledWith(2, 'album-change', savedAlbum)
        expect(broadcast).toHaveBeenNthCalledWith(3, 'track-change', track1)
        expect(broadcast).toHaveBeenNthCalledWith(
          4,
          'track-change',
          savedTrack1
        )
        expect(broadcast).toHaveBeenNthCalledWith(5, 'track-change', track2)
        expect(broadcast).toHaveBeenNthCalledWith(
          6,
          'track-change',
          savedTrack2
        )
        expect(broadcast).toHaveBeenCalledTimes(6)
      })

      it('ignores unknown album', async () => {
        albumsModel.getById.mockResolvedValueOnce(null)
        await manager.saveForAlbum(album.id, source)

        expect(albumsModel.save).not.toHaveBeenCalled()
        expect(tracksModel.getByIds).not.toHaveBeenCalled()
        expect(tracksModel.save).not.toHaveBeenCalled()
        await expect(fs.access(media, constants.R_OK)).rejects.toThrow(/ENOENT/)
        expect(broadcast).not.toHaveBeenCalled()
      })
    })

    it('handles download failure', async () => {
      const media = resolve(os.tmpdir(), 'media', `${album.id}.jpg`)
      albumsModel.getById.mockResolvedValueOnce({ ...album, media })
      tracksModel.getByIds.mockResolvedValueOnce([track1, track2])
      const oldContent = 'old content'
      await fs.ensureFile(media)
      await fs.writeFile(media, oldContent)

      await manager.saveForAlbum(album.id, 'https://doesnotexist.ukn/image.jpg')

      expect(albumsModel.save).not.toHaveBeenCalled()
      expect(tracksModel.save).not.toHaveBeenCalled()
      const content = await fs.readFile(media, 'utf8')
      expect(content).toEqual(oldContent)
      expect(broadcast).not.toHaveBeenCalled()
    }, 10e3)

    it('handles unknown source file', async () => {
      const media = resolve(os.tmpdir(), 'media', `${album.id}.jpg`)
      albumsModel.getById.mockResolvedValueOnce({ ...album, media })
      tracksModel.getByIds.mockResolvedValueOnce([track1, track2])
      const oldContent = 'old content'
      await fs.ensureFile(media)
      await fs.writeFile(media, oldContent)

      await manager.saveForAlbum(album.id, '/user/doesnotexist/source.jpg')

      expect(albumsModel.save).not.toHaveBeenCalled()
      expect(tracksModel.save).not.toHaveBeenCalled()
      const content = await fs.readFile(media, 'utf8')
      expect(content).toEqual(oldContent)
      expect(broadcast).not.toHaveBeenCalled()
    }, 10e3)
  })

  describe('saveForArtist()', () => {
    const artist = {
      id: faker.random.number({ min: 9999 }),
      name: faker.name.findName(),
      media: null,
      linked: [],
      trackIds: []
    }

    describe.each([
      [
        'remote',
        'https://www.theaudiodb.com/images/media/artist/thumb/uxrqxy1347913147.jpg',
        resolve(os.tmpdir(), 'media', `${artist.id}.jpeg`)
      ],
      [
        'local',
        resolve(__dirname, '..', '..', 'fixtures', 'avatar.jpg'),
        resolve(os.tmpdir(), 'media', `${artist.id}.jpg`)
      ]
    ])('given a %s media', (unused, source, media) => {
      beforeEach(async () => {
        jest.resetAllMocks()
        electron.app.getPath.mockReturnValue(os.tmpdir())
        try {
          await fs.unlink(media)
        } catch (err) {
          // ignore missing files
        }
      })
      it('downloads and adds media artist', async () => {
        const savedArtist = { ...artist, media }
        artistsModel.getById.mockResolvedValueOnce(artist)
        artistsModel.save.mockResolvedValueOnce({ saved: [savedArtist] })

        await manager.saveForArtist(artist.id, source)

        expect(artistsModel.save).toHaveBeenCalledWith(savedArtist)
        expect(artistsModel.save).toHaveBeenCalledTimes(1)
        expect(await fs.access(media, constants.R_OK))
        expect(broadcast).toHaveBeenNthCalledWith(1, 'artist-change', artist)
        expect(broadcast).toHaveBeenNthCalledWith(
          2,
          'artist-change',
          savedArtist
        )
        expect(broadcast).toHaveBeenCalledTimes(2)
      })

      it('downloads and replace media artist', async () => {
        const savedArtist = { ...artist, media }
        artistsModel.getById.mockResolvedValueOnce(savedArtist)
        artistsModel.save.mockResolvedValueOnce({ saved: [savedArtist] })
        const oldContent = 'old content'
        await fs.ensureFile(media)
        await fs.writeFile(media, oldContent)

        await manager.saveForArtist(artist.id, source)

        expect(artistsModel.save).toHaveBeenCalledWith(savedArtist)
        expect(artistsModel.save).toHaveBeenCalledTimes(1)
        expect(await fs.access(media, constants.R_OK))
        const content = await fs.readFile(media, 'utf8')
        expect(content).not.toEqual(oldContent)
        expect(content).toBeDefined()
        expect(broadcast).toHaveBeenNthCalledWith(1, 'artist-change', artist)
        expect(broadcast).toHaveBeenNthCalledWith(
          2,
          'artist-change',
          savedArtist
        )
        expect(broadcast).toHaveBeenCalledTimes(2)
      })

      it('ignores unknown artist', async () => {
        artistsModel.getById.mockResolvedValueOnce(null)
        await manager.saveForArtist(artist.id, source)

        expect(artistsModel.save).not.toHaveBeenCalled()
        await expect(fs.access(media, constants.R_OK)).rejects.toThrow(/ENOENT/)
        expect(broadcast).not.toHaveBeenCalled()
      })
    })

    it('handles download failure', async () => {
      const media = resolve(os.tmpdir(), 'media', `${artist.id}.jpg`)
      artistsModel.getById.mockResolvedValueOnce({ ...artist, media })
      const oldContent = 'old content'
      await fs.ensureFile(media)
      await fs.writeFile(media, oldContent)

      await manager.saveForArtist(
        artist.id,
        'https://doesnotexist.ukn/image.jpg'
      )

      expect(artistsModel.save).not.toHaveBeenCalled()
      const content = await fs.readFile(media, 'utf8')
      expect(content).toEqual(oldContent)
      expect(broadcast).not.toHaveBeenCalled()
    }, 10e3)

    it('handles unknown source file', async () => {
      const media = resolve(os.tmpdir(), 'media', `${artist.id}.jpg`)
      artistsModel.getById.mockResolvedValueOnce({ ...artist, media })
      const oldContent = 'old content'
      await fs.ensureFile(media)
      await fs.writeFile(media, oldContent)

      await manager.saveForArtist(artist.id, '/user/doesnotexist/source.jpg')

      expect(artistsModel.save).not.toHaveBeenCalled()
      const content = await fs.readFile(media, 'utf8')
      expect(content).toEqual(oldContent)
      expect(broadcast).not.toHaveBeenCalled()
    }, 10e3)
  })
})

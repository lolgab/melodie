'use strict'

const faker = require('faker')
const fs = require('fs-extra')
const os = require('os')
const { join } = require('path')
const { albumsModel } = require('./albums')
const { hash } = require('../utils')

describe('Albums model', () => {
  beforeAll(async () => {
    const dbFile = join(
      await fs.mkdtemp(join(os.tmpdir(), 'melodie-')),
      'db.sqlite3'
    )
    await albumsModel.init(dbFile)
  })

  afterAll(async () => {
    await albumsModel.constructor.release()
  })

  it('adds new album', async () => {
    const name = faker.commerce.productName()
    const album = {
      id: hash(name),
      media: faker.image.image(),
      name,
      trackIds: [faker.random.number(), faker.random.number()],
      refs: []
    }

    await albumsModel.save(album)
    expect((await albumsModel.list()).results).toEqual([album])
  })
})

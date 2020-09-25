'use strict'

import { combineLatest } from 'rxjs'
import { pluck, map } from 'rxjs/operators'
import * as albums from './albums'
import * as artists from './artists'
import * as playlists from './playlists'
import { fromServerChannel } from '../utils'

export const isLoading = combineLatest([
  fromServerChannel('tracking').pipe(pluck('inProgress')),
  albums.isListing,
  artists.isListing,
  playlists.isListing
]).pipe(
  map(statuses => (statuses.length ? statuses.some(status => status) : false))
)

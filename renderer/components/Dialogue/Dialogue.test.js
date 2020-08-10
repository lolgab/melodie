'use strict'

import { tick } from 'svelte'
import { writable, get } from 'svelte/store'
import { screen, render, fireEvent } from '@testing-library/svelte'
import html from 'svelte-htm'
import faker from 'faker'
import Dialogue from './Dialogue.svelte'

describe('Dialogue component', () => {
  it('displays title and dispatches open event', async () => {
    const open = writable(false)
    const title = faker.lorem.words()
    const handleOpen = jest.fn()
    const handleClose = jest.fn()
    render(
      html`<${Dialogue}
        on:open=${handleOpen}
        on:close=${handleClose}
        bind:open=${open}
        title=${title}
      />`
    )

    expect(screen.queryByText(title)).not.toBeVisible()
    expect(handleOpen).not.toHaveBeenCalled()
    expect(handleClose).not.toHaveBeenCalled()
    open.set(true)

    await tick()

    expect(screen.queryByText(title)).toBeVisible()
    expect(handleOpen).toHaveBeenCalled()
    expect(handleClose).not.toHaveBeenCalled()
  })

  it('closes on backdrop click and dispatches close event', async () => {
    const open = writable(true)
    const title = faker.lorem.words()
    const handleOpen = jest.fn()
    const handleClose = jest.fn()
    render(
      html`<${Dialogue}
        on:open=${handleOpen}
        on:close=${handleClose}
        bind:open=${open}
        title=${title}
      />`
    )
    await tick()

    expect(screen.queryByText(title)).toBeVisible()
    expect(handleOpen).not.toHaveBeenCalled()
    expect(handleClose).not.toHaveBeenCalled()

    await fireEvent.click(screen.queryByRole('button').closest('div'))

    expect(screen.queryByText(title)).not.toBeVisible()
    expect(handleClose).toHaveBeenCalled()
    expect(get(open)).toBe(false)
  })

  it('closes on close button click and dispatches close event', async () => {
    const open = writable(true)
    const title = faker.lorem.words()
    const handleOpen = jest.fn()
    const handleClose = jest.fn()
    render(
      html`<${Dialogue}
        on:open=${handleOpen}
        on:close=${handleClose}
        bind:open=${open}
        title=${title}
      />`
    )
    await tick()

    expect(screen.queryByText(title)).toBeVisible()
    expect(handleOpen).not.toHaveBeenCalled()
    expect(handleClose).not.toHaveBeenCalled()

    await fireEvent.click(screen.queryByRole('button'))

    expect(screen.queryByText(title)).not.toBeVisible()
    expect(handleClose).toHaveBeenCalled()
    expect(get(open)).toBe(false)
  })
})

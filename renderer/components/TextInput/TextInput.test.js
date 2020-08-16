'use strict'

import { render, screen, fireEvent } from '@testing-library/svelte'
import html from 'svelte-htm'
import TextInput from './TextInput.svelte'

describe('TextInput component', () => {
  beforeEach(() => jest.resetAllMocks())

  it('does not render icon by default', async () => {
    const handleIconClick = jest.fn()

    render(html`<${TextInput} type="search" />`)
    expect(handleIconClick).not.toHaveBeenCalled()

    expect(screen.getByRole('searchbox').previousElementSibling).toBeNull()
  })

  it('fires clicks on icon', async () => {
    const handleIconClick = jest.fn()

    render(html`<${TextInput} on:iconClick=${handleIconClick} icon="search" />`)
    expect(handleIconClick).not.toHaveBeenCalled()

    await fireEvent.click(screen.getByRole('textbox').previousElementSibling)

    expect(handleIconClick).toHaveBeenCalled()
  })
})

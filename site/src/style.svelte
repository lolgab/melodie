<style global type="postcss">
  html,
  body {
    @apply overflow-auto;
    background: var(--bg-color);
    scroll-behavior: smooth;
  }

  h1,
  h2,
  h3,
  h4 {
    @apply uppercase border-b-2 pb-2;
    border-bottom-color: var(--outline-color);
    font-family: Raleway;
  }
  h1 {
    @apply text-4xl;
  }
  h2,
  h3 {
    @apply text-2xl;
  }
</style>

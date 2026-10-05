// Routing + prerendering behavior tests. Run against the prerendered dist/
// served with GitHub Pages semantics (see playwright.config.js).
import { expect, test } from '@playwright/test'
import { HYPER_TAU_URL, LEADERBOARD_MENU } from '../src/routes.js'

// ---------------------------------------------------------------------------
// Direct loads: every route serves a real page with its own title and content.
// ---------------------------------------------------------------------------

test('direct load: homepage', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/τ-bench — Benchmarking AI Agents/)
  await expect(page.locator('.preview-table-wrapper')).toHaveCount(3)
  await expect(page.getByText('How τ-bench has evolved')).toBeVisible()
})

test('direct load: leaderboard defaults to τ³-Banking', async ({ page }) => {
  await page.goto('/leaderboard')
  await expect(page).toHaveTitle(/Leaderboard — τ-bench/)
  await expect(page.getByRole('heading', { name: 'τ³-Banking Leaderboard' })).toBeVisible()
})

test('direct load: leaderboard respects benchmark param', async ({ page }) => {
  await page.goto('/leaderboard?benchmark=voice')
  await expect(page.getByRole('heading', { name: 'τ³-Voice Leaderboard' })).toBeVisible()
})

test('direct load: /progress shows leaderboard with progress section', async ({ page }) => {
  await page.goto('/progress')
  await expect(page.locator('#progress')).toBeAttached()
})

test('direct load: blog and visualizer', async ({ page }) => {
  await page.goto('/blog')
  await expect(page).toHaveTitle(/Blog — τ-bench/)

  await page.goto('/trajectory-visualizer')
  await expect(page).toHaveTitle(/Visualizer — τ-bench/)
})

test('direct load: community extensions', async ({ page }) => {
  await page.goto('/community')
  await expect(page).toHaveTitle(/Community Extensions — τ-bench/)
  await expect(page.getByRole('heading', { name: 'Community Extensions' })).toBeVisible()

  const tauRecCard = page.locator('.community-card').filter({ hasText: 'τ-Rec' })
  await expect(tauRecCard).toHaveCount(1)
  await expect(tauRecCard).toContainText('τ-Rec')
  await expect(tauRecCard.locator('a')).toHaveAttribute('href', 'https://github.com/nbharaths/tau-rec')
  await expect(tauRecCard.locator('a')).toHaveAttribute('target', '_blank')
})

test('community extensions page and nav stay responsive', async ({ page }) => {
  await page.goto('/community')

  for (const width of [769, 800, 900, 1100, 1101, 1150, 1440]) {
    await page.setViewportSize({ width, height: 800 })
    const layout = await page.evaluate(() => ({
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      navItems: [...document.querySelectorAll('.nav-links > *')].map((item) => {
        const rect = item.getBoundingClientRect()
        return { left: rect.left, right: rect.right, height: rect.height }
      }),
    }))

    expect(layout.hasHorizontalOverflow).toBe(false)
    for (const item of layout.navItems) {
      expect(item.left).toBeGreaterThanOrEqual(0)
      expect(item.right).toBeLessThanOrEqual(width)
      expect(item.height).toBeLessThanOrEqual(25)
    }
  }
})

test('community extensions is available from the mobile nav', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await page.locator('.mobile-menu-toggle').click()
  const communityLink = page.getByRole('button', { name: 'Community' })
  await expect(communityLink).toBeVisible()
  await communityLink.click()

  await expect(page).toHaveURL(/\/community$/)
  await expect(page).toHaveTitle(/Community Extensions — τ-bench/)
  await expect(page.getByRole('heading', { name: 'Community Extensions' })).toBeVisible()
  await expect(page.locator('.nav-links')).toHaveClass(/mobile-hidden/)

  await page.locator('.mobile-menu-toggle').click()
  await expect(page.getByRole('button', { name: 'Community' })).toHaveClass(/active/)
})

test('community extensions footer reaches the bottom on a tall viewport', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 890 })
  await page.goto('/community')

  const footerBottom = await page.locator('.simple-footer').evaluate(
    (footer) => footer.getBoundingClientRect().bottom
  )
  expect(footerBottom).toBeGreaterThanOrEqual(889)
})

test('static author and published blog pages link to community extensions', async ({ page }) => {
  for (const path of [
    '/authors/soham-ray.html',
    '/blog/tau-knowledge.html',
    '/blog/tau-voice-examples.html',
    '/blog/tau3-task-fixes.html',
  ]) {
    await page.goto(path)
    await expect(page.getByRole('link', { name: 'Community' })).toHaveAttribute('href', '/community')
  }
})

// ---------------------------------------------------------------------------
// Prerendered HTML: content and per-route meta exist without JavaScript.
// ---------------------------------------------------------------------------

test('prerendered leaderboard HTML contains content and meta', async ({ request }) => {
  const res = await request.get('/leaderboard')
  expect(res.status()).toBe(200)
  const html = await res.text()
  expect(html).toContain('<title>Leaderboard — τ-bench</title>')
  expect(html).toContain('τ³-Banking Leaderboard')
  expect(html).toContain('property="og:title"')
  expect(html).toContain('https://taubench.com/leaderboard')
})

test('prerendered homepage HTML contains preview cards', async ({ request }) => {
  const html = await (await request.get('/')).text()
  expect(html).toContain('preview-table-wrapper')
  expect(html).not.toContain('Loading leaderboard')
})

test('prerendered community HTML contains the extension and meta', async ({ request }) => {
  const res = await request.get('/community')
  expect(res.status()).toBe(200)
  const html = await res.text()
  expect(html).toContain('<title>Community Extensions — τ-bench</title>')
  expect(html).toContain('property="og:title"')
  expect(html).toContain('τ-Rec')
  expect(html).toContain('https://github.com/nbharaths/tau-rec')
  expect(html).toContain('https://taubench.com/community')
})

// ---------------------------------------------------------------------------
// Legacy hash links: every pre-path-routing URL shape redirects correctly.
// ---------------------------------------------------------------------------

test('legacy #leaderboard redirects with params intact', async ({ page }) => {
  await page.goto('/#leaderboard?benchmark=voice')
  await expect(page.getByRole('heading', { name: 'τ³-Voice Leaderboard' })).toBeVisible()
  await expect(page).toHaveURL(/\/leaderboard\?benchmark=voice/)
})

test('legacy benchmark=text maps to core', async ({ page }) => {
  await page.goto('/#leaderboard?benchmark=text')
  await expect(page.getByRole('heading', { name: 'τ²-bench Leaderboard' })).toBeVisible()
  await expect(page).toHaveURL(/benchmark=core/)
})

test('legacy #progress and deprecated #docs redirect', async ({ page }) => {
  await page.goto('/#progress')
  await expect(page).toHaveURL(/\/progress/)
  await expect(page.locator('#progress')).toBeAttached()

  await page.goto('/#docs')
  await expect(page).toHaveURL(/\/(\?.*)?$/)
  await expect(page.locator('.preview-table-wrapper')).toHaveCount(3)
})

test('legacy visualizer deep link preserves query', async ({ page }) => {
  await page.goto('/#trajectory-visualizer?view=tasks')
  await expect(page).toHaveURL(/\/trajectory-visualizer\?.*view=tasks/)
  await expect(page).toHaveTitle(/Visualizer — τ-bench/)
})

// ---------------------------------------------------------------------------
// Client-side navigation and history.
// ---------------------------------------------------------------------------

test('preview card navigates client-side; back returns home', async ({ page }) => {
  await page.goto('/')
  await page.locator('.preview-table-wrapper').first().click()
  await expect(page).toHaveURL(/\/leaderboard\?benchmark=knowledge/)
  await expect(page.getByRole('heading', { name: 'τ³-Banking Leaderboard' })).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/\/(\?.*)?$/)
  await expect(page.getByText('How τ-bench has evolved')).toBeVisible()
})

test('nav from /progress back to /leaderboard scrolls to top and keeps params', async ({ page }) => {
  await page.goto('/progress?benchmark=voice')
  // Wait for the auto-scroll down to the progress section to happen.
  await page.waitForFunction(() => window.scrollY > 0)

  await page.getByRole('button', { name: 'Leaderboards' }).click()
  await page.getByRole('menuitem', { name: /τ³-Voice/ }).click()
  await expect(page).toHaveURL(/\/leaderboard\?benchmark=voice/)
  await page.waitForFunction(() => window.scrollY === 0)
  await expect(page.getByRole('heading', { name: 'τ³-Voice Leaderboard' })).toBeVisible()
})

test('nav links update path and title', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Leaderboards' }).click()
  await page.getByRole('menuitem', { name: /τ³-Banking/ }).click()
  await expect(page).toHaveURL(/\/leaderboard\?benchmark=knowledge/)
  await expect(page).toHaveTitle(/Leaderboard — τ-bench/)

  await page.getByRole('button', { name: 'Overview' }).click()
  await expect(page).toHaveURL(/\/(\?.*)?$/)
  await expect(page).toHaveTitle(/τ-bench — Benchmarking AI Agents/)
})

// ---------------------------------------------------------------------------
// Leaderboards menu and the τ^τ-bench pointers.
// ---------------------------------------------------------------------------

test('Leaderboards menu lists every track and opens/closes', async ({ page }) => {
  await page.goto('/')
  const menu = page.getByRole('menu', { name: 'Leaderboards' })
  await expect(menu).toBeHidden()

  const trigger = page.getByRole('button', { name: 'Leaderboards' })
  await trigger.click()
  await expect(menu).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(menu.getByRole('menuitem')).toHaveCount(LEADERBOARD_MENU.length)
  for (const item of LEADERBOARD_MENU) {
    await expect(menu.getByRole('menuitem', { name: new RegExp(item.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeVisible()
  }

  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()

  await trigger.click()
  await page.locator('.hero-description').click()
  await expect(menu).toBeHidden()
})

test('Leaderboards menu closes on browser back/forward', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Leaderboards' }).click()
  await page.getByRole('menuitem', { name: /τ³-Voice/ }).click()
  await expect(page).toHaveURL(/\/leaderboard\?benchmark=voice/)

  const trigger = page.getByRole('button', { name: 'Leaderboards' })
  await trigger.click()
  await expect(page.getByRole('menu', { name: 'Leaderboards' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/(\?.*)?$/)
  await expect(page.getByRole('menu', { name: 'Leaderboards' })).toBeHidden()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
})

test('Leaderboards menu switches benchmark while already on the leaderboard', async ({ page }) => {
  await page.goto('/leaderboard?benchmark=core')
  await expect(page.getByRole('heading', { name: 'τ²-bench Leaderboard' })).toBeVisible()
  await page.getByRole('button', { name: 'Leaderboards' }).click()
  await page.getByRole('menuitem', { name: /τ³-Voice/ }).click()
  await expect(page).toHaveURL(/\/leaderboard\?benchmark=voice/)
  await expect(page.getByRole('heading', { name: 'τ³-Voice Leaderboard' })).toBeVisible()
})

test('τ^τ-bench entry opens the hyper-tau-bench site in a new tab', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Leaderboards' }).click()
  const hyper = page.getByRole('menuitem', { name: /τ\^τ-bench/ })
  await expect(hyper).toHaveAttribute('href', HYPER_TAU_URL)
  await expect(hyper).toHaveAttribute('target', '_blank')
  await expect(hyper).toContainText('New')
})

test('announcement banner points at τ^τ-bench', async ({ page }) => {
  await page.goto('/')
  const banner = page.locator('.update-notification')
  await expect(banner).toContainText('-bench is here')
  await expect(banner.locator('.notification-link')).toHaveAttribute('href', HYPER_TAU_URL)
})

// ---------------------------------------------------------------------------
// Unknown paths: GitHub Pages serves 404.html, which boots the SPA.
// ---------------------------------------------------------------------------

test('unknown path returns 404 status but renders the app', async ({ page }) => {
  const response = await page.goto('/definitely-not-a-page')
  expect(response.status()).toBe(404)
  await expect(page.locator('.preview-table-wrapper')).toHaveCount(3)
})

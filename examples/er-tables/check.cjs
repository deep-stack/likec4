const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const fixtures = require('./fixtures.json')
;(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox'],
  })
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1050 } })
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    const first = page.locator('[data-figure="first"]')
    const results = []
    const screenshot = name => page.screenshot({ path: path.join(__dirname, `${name}.png`), fullPage: true })
    async function endpoints(fixture) {
      const values = await first.evaluate(
        (root, fixture) =>
          fixture.dump.views[fixture.id].edges.flatMap(edge =>
            edge.tableRelation.pairs.map((pair, index) => {
              const line = root.querySelector(
                `[data-table-edge="${edge.id}"] [data-table-pair="${index}"] .likec4-table-edge-path`,
              )
              const start = line.getPointAtLength(0).matrixTransform(line.getScreenCTM())
              const end = line.getPointAtLength(line.getTotalLength()).matrixTransform(line.getScreenCTM())
              const a = root.querySelector(`[data-id="${edge.source}"] [data-field="${pair.source}"]`)
                .getBoundingClientRect()
              const b = root.querySelector(`[data-id="${edge.target}"] [data-field="${pair.target}"]`)
                .getBoundingClientRect()
              return [
                Math.abs(start.x - a.right),
                Math.abs(start.y - a.y - a.height / 2),
                Math.abs(end.x - (edge.source === edge.target ? b.right : b.left)),
                Math.abs(end.y - b.y - b.height / 2),
              ]
            })
          ),
        fixture,
      )
      for (const value of values.flat()) assert.ok(value < 2, `Field endpoint offset ${value}`)
    }
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:34468/')
    await first.locator('[data-field]').first().waitFor()
    await page.waitForTimeout(700)
    assert.equal(await first.locator('[data-field]').count(), 21)
    await endpoints(fixtures[0])
    assert.equal(await first.locator('.likec4-table-edge marker').count(), 2)
    assert.equal(await first.locator('animateMotion').count(), 0)
    await screenshot('native-webharvest-light')
    await first.getByRole('group', { name: 'Table scrape_request', exact: true }).hover()
    assert.equal(await first.locator('.likec4-table[data-er-related="false"]').count(), 2)
    assert.equal(await first.locator('animateMotion').count(), 6)
    const particle = first.locator('.likec4-table-particle').first()
    const position = () =>
      particle.evaluate(el => {
        const m = el.getCTM()
        return [m.e, m.f]
      })
    const before = await position()
    await page.waitForTimeout(300)
    assert.notDeepEqual(await position(), before, 'Particles must move')
    assert.equal(await particle.getAttribute('rx'), '5')
    assert.equal(await particle.getAttribute('ry'), '1.2')
    assert.equal(await first.locator('animateMotion').first().getAttribute('dur'), '6s')
    await first.getByRole('button', { name: 'Pause relationship flow', exact: true }).click()
    await first.getByRole('group', { name: 'Table scrape_request', exact: true }).hover()
    assert.equal(await first.locator('animateMotion').count(), 0)
    await first.getByRole('button', { name: 'Animate relationship flow', exact: true }).click()
    await first.getByRole('group', { name: 'Table scrape_request', exact: true }).hover()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForTimeout(100)
    assert.equal(await first.locator('animateMotion').count(), 0)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
    await first.getByRole('group', { name: 'Table scrape_request', exact: true }).hover()
    await screenshot('native-webharvest-dark')
    await page.getByRole('button', { name: 'Show synthetic test schema', exact: true }).click()
    await page.waitForTimeout(700)
    assert.equal(await first.locator('[data-table-edge]').count(), 6)
    await endpoints(fixtures[1])
    await first.getByRole('group', { name: 'Table accounts', exact: true }).hover()
    assert.equal(await first.locator('.likec4-table[data-er-related="false"]').count(), 1)
    assert.equal(await first.locator('.likec4-table-edge[data-er-related="false"]').count(), 1)
    await screenshot('native-stress-dark')
    await page.getByRole('button', { name: 'Two figures', exact: true }).click()
    const second = page.locator('[data-figure="second"]')
    await second.locator('[data-field]').first().waitFor()
    await first.getByRole('group', { name: 'Table accounts', exact: true }).focus()
    assert.equal(await first.locator('.likec4-table[data-er-related="false"]').count(), 1)
    assert.equal(await second.locator('[data-er-related="false"]').count(), 0)
    await first.getByRole('group', { name: 'Table disconnected', exact: true }).hover()
    assert.equal(await first.locator('.likec4-table-edge[data-er-related="false"]').count(), 6)
    await page.mouse.move(5, 5)
    assert.equal(await first.locator('.likec4-table-edge[data-er-related="false"]').count(), 1)

    const markerIds = await page.locator('.likec4-table-edge marker').evaluateAll(nodes => nodes.map(n => n.id))
    assert.equal(new Set(markerIds).size, markerIds.length)
    for (const id of ['accounts', 'assignments', 'audit_log', 'disconnected']) {
      const node = first.locator(`[data-id="${id}"]`)
      const old = await node.boundingBox()
      const other = await second.locator(`[data-id="${id}"]`).getAttribute('style')
      const viewport = await first.locator('.react-flow__viewport').getAttribute('style')
      const header = await node.locator('.likec4-table-header').boundingBox()
      await page.mouse.move(header.x + 25, header.y + 15)
      await page.mouse.down()
      await page.mouse.move(header.x + 80, header.y + 45, { steps: 8 })
      await endpoints(fixtures[1])
      await page.mouse.up()
      await endpoints(fixtures[1])
      const moved = await node.boundingBox()
      assert.ok(moved.x - old.x > 45 && moved.y - old.y > 20, `Drag ${id}`)
      assert.equal(await first.locator('.react-flow__viewport').getAttribute('style'), viewport)
      assert.equal(await second.locator(`[data-id="${id}"]`).getAttribute('style'), other)
    }
    await first.getByRole('button', { name: 'Reset table positions', exact: true }).click()
    await endpoints(fixtures[1])
    await first.getByRole('button', { name: 'Zoom In', exact: true }).click()
    await page.waitForTimeout(500)
    await first.getByRole('button', { name: 'Fit View', exact: true }).click()
    await page.waitForTimeout(500)
    await endpoints(fixtures[1])
    await page.getByRole('button', { name: 'Light theme', exact: true }).click()
    await screenshot('native-stress-light-two-figures')
    await page.getByRole('button', { name: 'One figure', exact: true }).click()
    await page.setViewportSize({ width: 700, height: 900 })
    await first.getByRole('button', { name: 'Fit View', exact: true }).click()
    await page.waitForTimeout(500)
    await endpoints(fixtures[1])
    await screenshot('native-narrow')
    assert.deepEqual(errors, [])
    results.push({
      nativeCompilerAndRenderer: true,
      fields: 21,
      crowFootMarkers: true,
      movingEllipses: 6,
      duration: '6s',
      hover: true,
      keyboard: true,
      independentDragging: true,
      selfReferences: true,
      rowAlignment: true,
      pause: true,
      reducedMotion: true,
      reset: true,
      twoFigures: true,
      themes: true,
      narrow: true,
      browserErrors: errors,
    })
    fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify(results, null, 2) + '\n')
    console.log(JSON.stringify(results, null, 2))
  } finally {
    await browser.close()
  }
})().catch(error => {
  console.error(error)
  process.exit(1)
})

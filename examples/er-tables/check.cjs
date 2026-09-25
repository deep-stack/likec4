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
  const page = await browser.newPage({ viewport: { width: 1500, height: 1050 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  const results = []
  const screenshot = async name => page.screenshot({ path: path.join(__dirname, `${name}.png`), fullPage: true })
  async function checkEndpoints(fixture) {
    const measurements = await page.locator('[data-figure="first"]').evaluate((root, fixture) => {
      return fixture.connections.map((c, i) => {
        const edge = root.querySelector(`[data-connection="edge${i}"] path.er-connection-path`)
        const start = edge.getPointAtLength(0).matrixTransform(edge.getScreenCTM())
        const end = edge.getPointAtLength(edge.getTotalLength()).matrixTransform(edge.getScreenCTM())
        const source = root.querySelector(`[data-id="${c.source}"] [data-field="${c.from}"]`).getBoundingClientRect()
        const target = root.querySelector(`[data-id="${c.target}"] [data-field="${c.to}"]`).getBoundingClientRect()
        return {
          edge: i,
          sourceY: Math.abs(start.y - (source.y + source.height / 2)),
          targetY: Math.abs(end.y - (target.y + target.height / 2)),
          sourceX: Math.abs(start.x - source.right),
          targetX: Math.abs(end.x - (c.source === c.target ? target.right : target.left)),
        }
      })
    }, fixture)
    for (const m of measurements) {
      for (const k of ['sourceY', 'targetY', 'sourceX', 'targetX']) {
        assert.ok(m[k] < 2, `${fixture.id}/${m.edge}/${k}: ${m[k]}`)
      }
    }
    results.push({ fixture: fixture.id, endpoints: measurements })
  }
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:34466/')
  await page.locator('[data-field]').first().waitFor()
  await page.waitForTimeout(900)
  assert.equal(await page.locator('[data-field]').count(), 21)
  assert.equal(await page.locator('.react-flow__node').count(), 4)
  await checkEndpoints(fixtures[0])
  await screenshot('webharvest-light')
  await page.getByRole('group', { name: 'Table scrape_request', exact: true }).hover()
  assert.equal(await page.locator('[data-er-related="false"]').count(), 2)
  await checkEndpoints(fixtures[0])
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
  await screenshot('webharvest-dark')
  await page.getByRole('button', { name: 'Show synthetic test schema', exact: true }).click()
  await page.waitForTimeout(800)
  assert.equal(await page.locator('.react-flow__edge').count(), 6)
  await checkEndpoints(fixtures[1])
  await page.getByRole('group', { name: 'Table accounts', exact: true }).hover()
  assert.equal(await page.locator('[data-er-related="false"]').count(), 1)
  assert.equal(await page.locator('[data-connection="edge5"]').evaluate(el => getComputedStyle(el).opacity), '0.12')
  assert.equal(await page.locator('[data-connection="edge0"]').evaluate(el => getComputedStyle(el).opacity), '1')
  await screenshot('stress-dark-hover')
  await page.getByRole('button', { name: 'Two figures', exact: true }).click()
  await page.waitForTimeout(800)
  const first = page.locator('[data-figure="first"]')
  const second = page.locator('[data-figure="second"]')
  await first.getByRole('group', { name: 'Table accounts', exact: true }).focus()
  assert.equal(await first.locator('[data-er-related="false"]').count(), 1)
  assert.equal(await second.locator('[data-er-related="false"]').count(), 0)
  assert.equal(await second.locator('[data-connection="edge5"]').evaluate(el => getComputedStyle(el).opacity), '1')
  await page.getByRole('button', { name: 'Light theme', exact: true }).click()
  assert.equal(await first.locator('[data-er-related="false"]').count(), 0)
  const before = await first.locator('.react-flow__viewport').getAttribute('style')
  await first.getByRole('button', { name: 'Zoom In', exact: true }).click()
  await page.waitForTimeout(500)
  assert.notEqual(await first.locator('.react-flow__viewport').getAttribute('style'), before)
  await first.getByRole('button', { name: 'Fit View', exact: true }).click()
  await page.waitForTimeout(500)
  await checkEndpoints(fixtures[1])
  // Drag each connected table independently, including both ends of the self-loop.
  for (const id of ['accounts', 'assignments', 'audit_log', 'disconnected']) {
    const node = first.locator(`.react-flow__node[data-id="${id}"]`)
    const before = await node.boundingBox()
    const otherBefore = await second.locator(`.react-flow__node[data-id="${id}"]`).getAttribute('style')
    const viewport = await first.locator('.react-flow__viewport').evaluate(el => {
      const m = new DOMMatrix(getComputedStyle(el).transform)
      return [m.a, m.e, m.f]
    })
    const header = await node.locator('.er-header').boundingBox()
    await page.mouse.move(header.x + 40, header.y + 15)
    await page.mouse.down()
    await page.mouse.move(header.x + 95, header.y + 45, { steps: 8 })
    await checkEndpoints(fixtures[1])
    await page.mouse.up()
    await checkEndpoints(fixtures[1])
    const after = await node.boundingBox()
    assert.ok(after.x - before.x > 45 && after.y - before.y > 20, `move ${id}`)
    const viewportAfter = await first.locator('.react-flow__viewport').evaluate(el => {
      const m = new DOMMatrix(getComputedStyle(el).transform)
      return [m.a, m.e, m.f]
    })
    assert.equal(viewportAfter[0], viewport[0])
    assert.ok(
      Math.abs(viewportAfter[1] - viewport[1]) <= 1 && Math.abs(viewportAfter[2] - viewport[2]) <= 1,
      'Table dragging must not pan the canvas (allow LikeC4 pixel rounding)',
    )
    assert.equal(await second.locator(`.react-flow__node[data-id="${id}"]`).getAttribute('style'), otherBefore)
  }
  await page.mouse.move(10, 10)
  const particle = first.locator('.er-flow-particle').first()
  const firstPosition = await particle.evaluate(el => {
    const m = el.getCTM()
    return [m.e, m.f]
  })
  await page.waitForTimeout(250)
  const nextPosition = await particle.evaluate(el => {
    const m = el.getCTM()
    return [m.e, m.f]
  })
  assert.notDeepEqual(nextPosition, firstPosition, 'Green particles must move')
  const motionPaths = await first.locator('animateMotion').evaluateAll(elements =>
    elements.every(el =>
      el.getAttribute('path') === el.closest('.er-connection').querySelector('.er-connection-path').getAttribute('d')
    )
  )
  assert.equal(motionPaths, true, 'Particles follow current row paths')
  const markerIds = await page.locator('.er-connections marker').evaluateAll(elements => elements.map(el => el.id))
  assert.equal(new Set(markerIds).size, 2)
  await page.getByRole('button', { name: 'Pause flow', exact: true }).click()
  assert.equal(await page.locator('animateMotion').count(), 0)
  await page.getByRole('button', { name: 'Animate flow', exact: true }).click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await first.locator('.er-flow-particle').first().evaluate(el => getComputedStyle(el).display), 'none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByRole('button', { name: 'Reset positions', exact: true }).click()
  await page.waitForTimeout(600)
  await checkEndpoints(fixtures[1])
  results.push({
    independentTableDragging: true,
    duringAndAfterDragEndpoints: true,
    selfLoopFollowsTable: true,
    animatedGreenParticles: true,
    pauseFlow: true,
    reducedMotion: true,
    uniqueMarkerIds: true,
    resetPositions: true,
  })
  await screenshot('stress-light-two-figures')
  assert.deepEqual(errors, [])
  results.push({
    fields: 21,
    hover: true,
    keyboardFocus: true,
    unrelatedNeighbourEdgeDimmed: true,
    twoFiguresIsolated: true,
    lightAndDark: true,
    nativeZoomAndFit: true,
    browserErrors: errors,
  })
  fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify(results, null, 2) + '\n')
  console.log(JSON.stringify(results, null, 2))
  await browser.close()
})().catch(e => {
  console.error(e)
  process.exit(1)
})

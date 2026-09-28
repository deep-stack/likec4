const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
;(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox'],
  })
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:34470/')
    await page.locator('[data-uml-member]').first().waitFor()
    assert.ok(await page.locator('.likec4-class__root').count() >= 12)
    assert.ok(await page.locator('.react-flow__node-uml-artifact').count() >= 4)
    assert.ok(await page.locator('.likec4-uml-end-labels rect').count() > 0)
    const card = page.locator('.react-flow__node[data-id="account"]')
    const other = page.locator('.react-flow__node[data-id="savings"]')
    const otherBefore = await other.boundingBox()
    const initial = await card.boundingBox()
    const pathsBefore = await page.locator('.react-flow__edge path').evaluateAll(paths =>
      paths.map(p => p.getAttribute('d'))
    )
    const viewportBefore = await page.locator('.react-flow__viewport').getAttribute('style')
    await page.mouse.move(initial.x + initial.width / 2, initial.y + 12)
    await page.mouse.down()
    await page.mouse.move(initial.x + initial.width / 2 + 60, initial.y + 42, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    const moved = await card.boundingBox()
    assert.deepEqual(await other.boundingBox(), otherBefore, 'Dragging must leave other classes in place')
    assert.ok(Math.abs(moved.x - initial.x - 60) < 3, 'Dragging must move the selected class')
    assert.equal(
      await page.locator('.react-flow__viewport').getAttribute('style'),
      viewportBefore,
      'Dragging a class must not pan the canvas',
    )
    const pathsAfter = await page.locator('.react-flow__edge path').evaluateAll(paths =>
      paths.map(p => p.getAttribute('d'))
    )
    assert.notDeepEqual(pathsAfter, pathsBefore, 'Connectors must follow the moved class')
    await page.screenshot({ path: '/tmp/class-latest-preview.png' })
    const before = await page.locator('[data-id="account"]').boundingBox()
    const toggle = page.locator('[data-id="account"] button[aria-expanded]').first()
    await toggle.focus()
    await page.keyboard.press('Enter')
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
    await page.waitForTimeout(300)
    const after = await page.locator('[data-id="account"]').boundingBox()
    assert.ok(after.height < before.height, 'Collapse must resize the node')
    await toggle.click()
    await page.getByRole('button', { name: 'publicApi', exact: true }).click()
    await page.locator('[data-uml-member="create"]').waitFor()
    assert.equal(await page.locator('[data-uml-member="id"]').count(), 0)
    assert.equal(await page.locator('[data-uml-member="balance"]').count(), 0)
    assert.equal(await page.locator('.react-flow__node-uml-artifact').count(), 0)
    await page.locator('[data-uml-member="create"]').focus()
    await page.keyboard.press('Enter')
    await page.getByText('class members', { exact: true }).waitFor()
    await page.keyboard.press('Escape')
    await page.reload()
    await page.locator('[data-uml-member]').first().waitFor()
    await page.getByRole('button', { name: 'packages', exact: true }).click()
    await page.locator('[data-uml-member="city"]').waitFor()
    assert.equal(await page.locator('.react-flow__node-compound-element').count(), 1)
    await page.getByRole('button', { name: 'Change theme', exact: true }).click()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(300)
    assert.deepEqual(errors, [])
    console.log(
      'Passed: individual dragging, attached connectors, class compartments, advanced artifacts, qualifiers, keyboard collapse, view filtering, details, packages, dark theme and narrow viewport',
    )
  } finally {
    await browser.close()
  }
})().catch(error => {
  console.error(error)
  process.exit(1)
})

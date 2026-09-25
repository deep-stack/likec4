const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1050 } })
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:34466/')
    const node = page.locator('.react-flow__node[data-id="scrape_request"]')
    await node.waitFor()
    await page.waitForTimeout(700)
    const before = await node.boundingBox()
    const viewportBefore = await page.locator('.react-flow__viewport').getAttribute('style')
    const header = await node.locator('.er-header').boundingBox()
    await page.mouse.move(header.x + 70, header.y + 15)
    await page.mouse.down()
    await page.mouse.move(header.x + 180, header.y + 75, { steps: 12 })
    await page.mouse.up()
    const after = await node.boundingBox()
    assert.equal(
      await page.locator('.react-flow__viewport').getAttribute('style'),
      viewportBefore,
      'Dragging a table must not pan the canvas',
    )
    assert.ok(after.x - before.x > 80 && after.y - before.y > 40, 'Dragging must move the table')
    console.log('Dragging passed')
  } finally {
    await browser.close()
  }
})().catch(e => {
  console.error(e)
  process.exit(1)
})

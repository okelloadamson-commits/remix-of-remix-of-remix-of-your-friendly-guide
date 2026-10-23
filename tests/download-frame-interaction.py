"""Run with python3 tests/download-frame-interaction.py against the dev preview."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT = Path('/tmp/browser/download-shields')

async def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for width, height in [(1280, 1800), (390, 844)]:
            context = await browser.new_context(viewport={'width': width, 'height': height})
            button_top = 155 if width >= 768 else 195
            markup = f'''<body style="margin:0"><a href="/movie-title-target" target="_blank" style="position:absolute;top:40px;left:30%">Movie name</a>
            <a href="/other-target" target="_blank" style="position:absolute;top:240px;left:2%">Other link</a>
            <form action="/test-download"><button style="position:absolute;top:{button_top}px;left:35%;height:36px">Download anyway</button></form></body>'''
            await context.route('**/confirmation-shield-test', lambda r: r.fulfill(content_type='text/html', body=markup))
            await context.route('**/test-download*', lambda r: r.fulfill(content_type='video/mp4', headers={'Content-Disposition': 'attachment; filename="test.mp4"'}, body=b'download-shield-test'))
            page = await context.new_page()
            await page.goto('http://localhost:8080', wait_until='domcontentloaded')
            await page.evaluate('''async () => {
              const R = await import('/node_modules/.vite/deps/react.js');
              const D = await import('/node_modules/.vite/deps/react-dom_client.js');
              const {DownloadFrameDialog: C} = await import('/src/components/DownloadFrameDialog.tsx');
              const el = document.createElement('div'); document.body.appendChild(el);
              const root = (D.createRoot || D.default.createRoot)(el);
              window.renderShieldTest = () => root.render((R.createElement || R.default.createElement)(C, {
                open:true, url:'/confirmation-shield-test', title:'Shield test', onClose:()=>{}
              })); window.renderShieldTest();
            }''')
            frame_element = page.locator('iframe[title="Shield test"]')
            frame = page.frame_locator('iframe[title="Shield test"]')
            await frame.get_by_role('button', name='Download anyway').wait_for()
            await frame_element.evaluate('(e)=>window.originalShieldFrame=e')
            for _ in range(12):
                await page.evaluate('window.renderShieldTest()')
                await page.wait_for_timeout(50)
            assert await frame_element.evaluate('(e)=>e===window.originalShieldFrame')
            for label in ['Movie name', 'Other link']:
                bounds = await frame.get_by_role('link', name=label).bounding_box()
                assert bounds
                await page.mouse.click(bounds['x'] + bounds['width']/2, bounds['y'] + bounds['height']/2)
            await page.wait_for_timeout(200)
            assert len(context.pages) == 1, 'A shielded link opened a new tab'
            assert page.url == 'http://localhost:8080/'
            async with page.expect_download() as event:
                await frame.get_by_role('button', name='Download anyway').click()
            download = await event.value
            file = OUTPUT / f'{width}-test.mp4'
            await download.save_as(file)
            assert file.stat().st_size == len(b'download-shield-test')
            await page.screenshot(path=str(OUTPUT / f'{width}.png'))
            print(f'PASS {width}: name and surrounding link blocked; provider button downloads; frame stable')
            await context.close()
        await browser.close()

asyncio.run(main())
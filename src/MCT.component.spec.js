const { test, expect } = require('@playwright/experimental-ct-vue2');
const MCT = require('./MCT');

test.use({ viewport: { width: 500, height: 500 } });

test('should work', async ({ mount }) => {
  const component = await mount(MCT);
  await expect(component).toContainText('Learn React');
});
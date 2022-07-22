/*****************************************************************************
 * Open MCT, Copyright (c) 2014-2022, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/

const { test } = require('../../../fixtures');
const { expect } = require('@playwright/test');
const path = require('path');

const TEST_TEXT = 'Testing text for entries.';
const TEST_TEXT_NAME = 'Test Page';
const CUSTOM_NAME = 'CUSTOM_NAME';
const NOTEBOOK_DROP_AREA = '.c-notebook__drag-area';

test.describe('Restricted Notebook', () => {
    test.beforeEach(async ({ page }) => {
        await startAndAddRestrictedNotebookObject(page);
    });

    test('Can be renamed @addInit', async ({ page }) => {
        await expect(page.locator('.l-browse-bar__object-name')).toContainText(`Unnamed ${CUSTOM_NAME}`);
    });

    test('Can be deleted if there are no locked pages @addInit', async ({ page }) => {
        await openContextMenuRestrictedNotebook(page);

        const menuOptions = page.locator('.c-menu ul');
        await expect.soft(menuOptions).toContainText('Remove');

        const restrictedNotebookTreeObject = page.locator(`a:has-text("Unnamed ${CUSTOM_NAME}")`);

        // notbook tree object exists
        expect.soft(await restrictedNotebookTreeObject.count()).toEqual(1);

        // Click Remove Text
        await page.locator('text=Remove').click();

        // Click 'OK' on confirmation window and wait for save banner to appear
        await Promise.all([
            page.waitForNavigation(),
            page.locator('text=OK').click(),
            page.waitForSelector('.c-message-banner__message')
        ]);

        // has been deleted
        expect(await restrictedNotebookTreeObject.count()).toEqual(0);
    });

    test('Can be locked if at least one page has one entry @addInit', async ({ page }) => {

        await enterTextEntry(page);

        const commitButton = page.locator('button:has-text("Commit Entries")');
        expect(await commitButton.count()).toEqual(1);
    });

});

test.describe('Restricted Notebook with at least one entry and with the page locked @addInit', () => {

    test.beforeEach(async ({ page }) => {
        await startAndAddRestrictedNotebookObject(page);
        await enterTextEntry(page);
        await lockPage(page);

        // FIXME: Give ample time for the mutation to happen
        // https://github.com/nasa/openmct/issues/5409
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(1 * 1000);

        // open sidebar
        await page.locator('button.c-notebook__toggle-nav-button').click();
    });

    test('Locked page should now be in a locked state @addInit', async ({ page }, testInfo) => {
        test.fixme(testInfo.project === 'chrome-beta', "Test is unreliable on chrome-beta");
        // main lock message on page
        const lockMessage = page.locator('text=This page has been committed and cannot be modified or removed');
        expect.soft(await lockMessage.count()).toEqual(1);

        // lock icon on page in sidebar
        const pageLockIcon = page.locator('ul.c-notebook__pages li div.icon-lock');
        expect.soft(await pageLockIcon.count()).toEqual(1);

        // no way to remove a restricted notebook with a locked page
        await openContextMenuRestrictedNotebook(page);
        const menuOptions = page.locator('.c-menu ul');

        await expect(menuOptions).not.toContainText('Remove');
    });

    test('Can still: add page, rename, add entry, delete unlocked pages @addInit', async ({ page }) => {
        // Click text=Page Add >> button
        await Promise.all([
            page.waitForNavigation(),
            page.locator('text=Page Add >> button').click()
        ]);
        // Click text=Unnamed Page >> nth=1
        await page.locator('text=Unnamed Page').nth(1).click();
        // Press a with modifiers
        await page.locator('text=Unnamed Page').nth(1).fill(TEST_TEXT_NAME);

        // expect to be able to rename unlocked pages
        const newPageElement = page.locator(`text=${TEST_TEXT_NAME}`);
        const newPageCount = await newPageElement.count();
        await newPageElement.press('Enter'); // exit contenteditable state
        expect.soft(newPageCount).toEqual(1);

        // enter test text
        await enterTextEntry(page);

        // expect new page to be lockable
        const commitButton = page.locator('BUTTON:HAS-TEXT("COMMIT ENTRIES")');
        expect.soft(await commitButton.count()).toEqual(1);

        // Click text=Unnamed PageTest Page >> button
        await page.locator('text=Unnamed PageTest Page >> button').click();
        // Click text=Delete Page
        await page.locator('text=Delete Page').click();
        // Click text=Ok
        await Promise.all([
            page.waitForNavigation(),
            page.locator('text=Ok').click()
        ]);

        // deleted page, should no longer exist
        const deletedPageElement = page.locator(`text=${TEST_TEXT_NAME}`);
        expect(await deletedPageElement.count()).toEqual(0);
    });
});

test.describe('Restricted Notebook with a page locked and with an embed @addInit', () => {

    test.beforeEach(async ({ page }) => {
        await startAndAddRestrictedNotebookObject(page);
        await dragAndDropEmbed(page);
    });

    test('Allows embeds to be deleted if page unlocked @addInit', async ({ page }) => {
        // Click .c-ne__embed__name .c-popup-menu-button
        await page.locator('.c-ne__embed__name .c-popup-menu-button').click(); // embed popup menu

        const embedMenu = page.locator('body >> .c-menu');
        await expect(embedMenu).toContainText('Remove This Embed');
    });

    test('Disallows embeds to be deleted if page locked @addInit', async ({ page }) => {
        await lockPage(page);
        // Click .c-ne__embed__name .c-popup-menu-button
        await page.locator('.c-ne__embed__name .c-popup-menu-button').click(); // embed popup menu

        const embedMenu = page.locator('body >> .c-menu');
        await expect(embedMenu).not.toContainText('Remove This Embed');
    });

});

/**
 * @param {import('@playwright/test').Page} page
 */
async function startAndAddRestrictedNotebookObject(page) {
    // eslint-disable-next-line no-undef
    await page.addInitScript({ path: path.join(__dirname, 'addInitRestrictedNotebook.js') });
    //Go to baseURL
    await page.goto('/', { waitUntil: 'networkidle' });
    //Click the Create button
    await page.click('button:has-text("Create")');
    // Click text=CUSTOME_NAME
    await page.click(`text=${CUSTOM_NAME}`); // secondarily tests renamability also
    // Click text=OK
    await Promise.all([
        page.waitForNavigation({waitUntil: 'networkidle'}),
        page.click('text=OK')
    ]);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function enterTextEntry(page) {
    // Click .c-notebook__drag-area
    await page.locator(NOTEBOOK_DROP_AREA).click();

    // enter text
    await page.locator('div.c-ne__text').click();
    await page.locator('div.c-ne__text').fill(TEST_TEXT);
    await page.locator('div.c-ne__text').press('Enter');
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function dragAndDropEmbed(page) {
    // Click button:has-text("Create")
    await page.locator('button:has-text("Create")').click();
    // Click li:has-text("Sine Wave Generator")
    await page.locator('li:has-text("Sine Wave Generator")').click();
    // Click form[name="mctForm"] >> text=My Items
    await page.locator('form[name="mctForm"] >> text=My Items').click();
    // Click text=OK
    await page.locator('text=OK').click();
    // Click text=Open MCT My Items >> span >> nth=3
    await page.locator('text=Open MCT My Items >> span').nth(3).click();
    // Click text=Unnamed CUSTOM_NAME
    await Promise.all([
        page.waitForNavigation(),
        page.locator('text=Unnamed CUSTOM_NAME').click()
    ]);

    await page.dragAndDrop('text=UNNAMED SINE WAVE GENERATOR', NOTEBOOK_DROP_AREA);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function lockPage(page) {
    const commitButton = page.locator('button:has-text("Commit Entries")');
    await commitButton.click();

    //Wait until Lock Banner is visible
    await page.locator('text=Lock Page').click();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openContextMenuRestrictedNotebook(page) {
    const myItemsFolder = page.locator('text=Open MCT My Items >> span').nth(3);
    const className = await myItemsFolder.getAttribute('class');
    if (!className.includes('c-disclosure-triangle--expanded')) {
        await myItemsFolder.click();
    }

    // Click a:has-text("Unnamed CUSTOM_NAME")
    await page.locator(`a:has-text("Unnamed ${CUSTOM_NAME}")`).click({
        button: 'right'
    });
}

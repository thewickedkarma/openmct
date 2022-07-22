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

const { test } = require('../../../fixtures.js');
const { expect } = require('@playwright/test');

test.describe('Timer', () => {

    test.beforeEach(async ({ page }) => {
        //Go to baseURL
        await page.goto('/', { waitUntil: 'networkidle' });

        //Click the Create button
        await page.click('button:has-text("Create")');

        // Click 'Timer'
        await page.click('text=Timer');

        // Click text=OK
        await Promise.all([
            page.waitForNavigation({waitUntil: 'networkidle'}),
            page.click('text=OK')
        ]);

        await expect(page.locator('.l-browse-bar__object-name')).toContainText('Unnamed Timer');
    });

    test('Can perform actions on the Timer', async ({ page }) => {
        test.info().annotations.push({
            type: 'issue',
            description: 'https://github.com/nasa/openmct/issues/4313'
        });

        await test.step("From the tree context menu", async () => {
            await triggerTimerContextMenuAction(page, 'Start');
            await triggerTimerContextMenuAction(page, 'Pause');
            await triggerTimerContextMenuAction(page, 'Restart at 0');
            await triggerTimerContextMenuAction(page, 'Stop');
        });

        await test.step("From the 3dot menu", async () => {
            await triggerTimer3dotMenuAction(page, 'Start');
            await triggerTimer3dotMenuAction(page, 'Pause');
            await triggerTimer3dotMenuAction(page, 'Restart at 0');
            await triggerTimer3dotMenuAction(page, 'Stop');
        });

        await test.step("From the object view", async () => {
            await triggerTimerViewAction(page, 'Start');
            await triggerTimerViewAction(page, 'Pause');
            await triggerTimerViewAction(page, 'Restart at 0');
        });
    });
});

/**
 * Actions that can be performed on a timer from context menus.
 * @typedef {'Start' | 'Stop' | 'Pause' | 'Restart at 0'} TimerAction
 */

/**
 * Actions that can be performed on a timer from the object view.
 * @typedef {'Start' | 'Pause' | 'Restart at 0'} TimerViewAction
 */

/**
 * Open the timer context menu from the object tree.
 * Expands the 'My Items' folder if it is not already expanded.
 * @param {import('@playwright/test').Page} page
 */
async function openTimerContextMenu(page) {
    const myItemsFolder = page.locator('text=Open MCT My Items >> span').nth(3);
    const className = await myItemsFolder.getAttribute('class');
    if (!className.includes('c-disclosure-triangle--expanded')) {
        await myItemsFolder.click();
    }

    await page.locator(`a:has-text("Unnamed Timer")`).click({
        button: 'right'
    });
}

/**
 * Trigger a timer action from the tree context menu
 * @param {import('@playwright/test').Page} page
 * @param {TimerAction} action
 */
async function triggerTimerContextMenuAction(page, action) {
    const menuAction = `.c-menu ul li >> text="${action}"`;
    await openTimerContextMenu(page);
    await page.locator(menuAction).click();
    assertTimerStateAfterAction(page, action);
}

/**
 * Trigger a timer action from the 3dot menu
 * @param {import('@playwright/test').Page} page
 * @param {TimerAction} action
 */
async function triggerTimer3dotMenuAction(page, action) {
    const menuAction = `.c-menu ul li >> text="${action}"`;
    const threeDotMenuButton = 'button[title="More options"]';
    let isActionAvailable = false;
    let iterations = 0;
    // Dismiss/open the 3dot menu until the action is available
    // or a maxiumum number of iterations is reached
    while (!isActionAvailable && iterations <= 20) {
        await page.click('.c-object-view');
        await page.click(threeDotMenuButton);
        isActionAvailable = await page.locator(menuAction).isVisible();
        iterations++;
    }

    await page.locator(menuAction).click();
    assertTimerStateAfterAction(page, action);
}

/**
 * Trigger a timer action from the object view
 * @param {import('@playwright/test').Page} page
 * @param {TimerViewAction} action
 */
async function triggerTimerViewAction(page, action) {
    await page.locator('.c-timer').hover({trial: true});
    const buttonTitle = buttonTitleFromAction(action);
    await page.click(`button[title="${buttonTitle}"]`);
    assertTimerStateAfterAction(page, action);
}

/**
 * Takes in a TimerViewAction and returns the button title
 * @param {TimerViewAction} action
 */
function buttonTitleFromAction(action) {
    switch (action) {
    case 'Start':
        return 'Start';
    case 'Pause':
        return 'Pause';
    case 'Restart at 0':
        return 'Reset';
    }
}

/**
 * Verify the timer state after a timer action has been performed.
 * @param {import('@playwright/test').Page} page
 * @param {TimerAction} action
 */
async function assertTimerStateAfterAction(page, action) {
    let timerStateClass;
    switch (action) {
    case 'Start':
    case 'Restart at 0':
        timerStateClass = "is-started";
        break;
    case 'Stop':
        timerStateClass = 'is-stopped';
        break;
    case 'Pause':
        timerStateClass = 'is-paused';
        break;
    }

    await expect.soft(page.locator('.c-timer')).toHaveClass(new RegExp(timerStateClass));
}

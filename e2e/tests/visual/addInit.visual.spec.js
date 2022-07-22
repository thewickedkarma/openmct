/* eslint-disable no-undef */
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

/*
Collection of Visual Tests set to run with modified init scripts to inject plugins not otherwise available in the default contexts.

These should only use functional expect statements to verify assumptions about the state
in a test and not for functional verification of correctness. Visual tests are not supposed
to "fail" on assertions. Instead, they should be used to detect changes between builds or branches.

Note: Larger testsuite sizes are OK due to the setup time associated with these tests.
*/

const { test } = require('../../fixtures.js');
const percySnapshot = require('@percy/playwright');
const path = require('path');
const sinon = require('sinon');

const VISUAL_GRACE_PERIOD = 5 * 1000; //Lets the application "simmer" before the snapshot is taken

const CUSTOM_NAME = 'CUSTOM_NAME';

// Snippet from https://github.com/microsoft/playwright/issues/6347#issuecomment-965887758
// Will replace with cy.clock() equivalent
test.beforeEach(async ({ context }) => {
    await context.addInitScript({
        path: path.join(__dirname, '../../..', './node_modules/sinon/pkg/sinon.js')
    });
    await context.addInitScript(() => {
        window.__clock = sinon.useFakeTimers({
            now: 0,
            shouldAdvanceTime: true
        }); //Set browser clock to UNIX Epoch
    });
});

test('Visual - Restricted Notebook is visually correct @addInit', async ({ page }) => {
    // eslint-disable-next-line no-undef
    await page.addInitScript({ path: path.join(__dirname, '../plugins/notebook', './addInitRestrictedNotebook.js') });
    //Go to baseURL
    await page.goto('/', { waitUntil: 'networkidle' });
    //Click the Create button
    await page.click('button:has-text("Create")');
    // Click text=CUSTOM_NAME
    await page.click(`text=${CUSTOM_NAME}`);
    // Click text=OK
    await Promise.all([
        page.waitForNavigation({waitUntil: 'networkidle'}),
        page.click('text=OK')
    ]);

    // Take a snapshot of the newly created CUSTOM_NAME notebook
    await page.waitForTimeout(VISUAL_GRACE_PERIOD);
    await percySnapshot(page, 'Restricted Notebook with CUSTOM_NAME');

});

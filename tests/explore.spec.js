import {test,expect} from "@playwright/test";
test.beforeEach(async({page})=>{await page.goto("/explore.html");});
test("Explore fills the blank area with all 24 original questions",async({page},testInfo)=>{
 await expect(page).toHaveTitle("Explore — LOCALINGO");
 await expect(page.locator(".question-card")).toHaveCount(24);
 expect(await page.locator(".question-card").evaluateAll(cards=>new Set(cards.map(c=>c.dataset.questionId)).size)).toBe(24);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator(".topic-button")).toHaveCount(4);
 await page.screenshot({path:testInfo.outputPath("explore.png"),fullPage:true,animations:"disabled"});
});
test("answers persist after reload and shuffle keeps all questions",async({page})=>{
 const first=page.locator(".question-card:not([hidden])");const id=await first.getAttribute("data-question-id");
 await first.locator(".question-choice").first().click();await expect(first.locator(".answer-feedback")).not.toBeEmpty();
 await expect(page.locator("#quiz-progress-text")).toContainText("1/24 answered");
 const before=await page.locator(".question-card").evaluateAll(cards=>cards.map(c=>c.dataset.questionId).join(","));
 await page.getByRole("button",{name:"↻ Shuffle",exact:true}).click();
 const after=await page.locator(".question-card").evaluateAll(cards=>cards.map(c=>c.dataset.questionId).join(","));
 expect(before).not.toBe(after);await expect(page.locator(".question-card")).toHaveCount(24);
 await page.reload();await expect(page.locator("#quiz-progress-text")).toContainText("1/24 answered");
 await expect(page.locator(`[data-question-id="${id}"] .question-choice`).first()).toBeDisabled();
});
test("topic cards filter questions and reset is confirmed",async({page})=>{
 await page.getByRole("button",{name:"Local Food",exact:true}).click();
 await expect(page.locator(".question-card")).toHaveCount(6);
 await page.locator(".question-card:not([hidden]) .question-choice").first().click();
 await page.getByRole("button",{name:"Start again",exact:true}).click();await expect(page.locator("#reset-dialog")).toBeVisible();
 await page.getByRole("button",{name:"Keep my answers"}).click();await expect(page.locator("#quiz-progress-text")).toContainText("1/24 answered");
 await page.getByRole("button",{name:"Start again",exact:true}).click();await page.getByRole("button",{name:"Clear Explore answers"}).click();
 await expect(page.locator("#quiz-progress-text")).toContainText("0/24 answered");
});
test("clean URL and skip link reach the topics",async({page})=>{
 await page.goto("/explore");await page.keyboard.press("Tab");await expect(page.getByRole("link",{name:"Skip to explore topics"})).toBeFocused();
 await page.keyboard.press("Enter");await expect(page.locator("#topics")).toBeFocused();
});

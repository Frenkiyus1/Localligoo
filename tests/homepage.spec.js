import { test, expect } from "@playwright/test";
test.beforeEach(async({page})=>{await page.goto("/");await page.locator(".page-art").evaluate(img=>img.decode());});
test("homepage loads artwork, removes Practice and shows contact email",async({page},testInfo)=>{
 await expect(page).toHaveTitle("LOCALINGO — From Local to Global");
 await page.locator(".element-visual img").evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.getByRole("heading",{name:"Your English journey",exact:true})).toBeAttached();
 await expect(page.locator("#practice,.nav-practice")).toHaveCount(0);
 await expect(page.getByRole("link",{name:"localingo.workspace@gmail.com"})).toHaveAttribute("href","mailto:localingo.workspace@gmail.com");
 await page.screenshot({path:testInfo.outputPath("homepage.png"),fullPage:true,animations:"disabled"});
});
test("Start learning and journey Learn link open real lessons",async({page})=>{
 await page.getByRole("link",{name:"Start learning",exact:true}).click();await expect(page).toHaveURL(/learn.html$/);
 await page.goto("/");await page.locator("#learn").focus();await page.keyboard.press("Enter");await expect(page).toHaveURL(/learn.html$/);
});
test("Explore and Badges remain accessible",async({page})=>{
 const nav=page.viewportSize().width<=640?page.locator(".mobile-nav"):page.locator(".desktop-nav");
 await nav.getByRole("button",{name:"Badges",exact:true}).click();await expect(page.getByRole("heading",{name:"Your badges",exact:true})).toBeVisible();
 await page.keyboard.press("Escape");await nav.getByRole("link",{name:"Explore",exact:true}).click();await expect(page).toHaveTitle("Explore — LOCALINGO");
});

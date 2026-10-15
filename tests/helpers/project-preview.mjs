import {expect} from '@playwright/test';

export async function projectPreview(page,id,{hover=false}={}) {
  await expect(page.locator('#local-time')).toContainText(/\d/);
  const phone=await page.evaluate(()=>document.documentElement.dataset.phoneLanding==='true');
  if(phone){
    const panel=page.locator(`.phone-project-panel[data-phone-project="${id}"]`);
    await page.locator(`[data-phone-project-target="${id}"]`).click();
    await expect(panel).toBeVisible();
    await expect.poll(()=>panel.evaluate(n=>n.getBoundingClientRect().top)).toBeCloseTo(0,0);
    return {phone,panel,card:panel.locator('.phone-project-card'),image:panel.locator('img'),copy:panel.locator('.phone-card-copy'),link:panel.locator('.phone-project-card')};
  }
  const link=page.locator(`.project-list [data-project="${id}"]`);
  if(hover)await link.hover();else await link.focus();
  return {phone,link,card:page.locator('.preview-panel'),image:page.locator('.preview-original'),copy:page.locator('.preview-details')};
}

export async function openProject(page,id) {
  const preview=await projectPreview(page,id);
  await preview.card.click();
}

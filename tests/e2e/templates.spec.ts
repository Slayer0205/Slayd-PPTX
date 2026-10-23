import { test, expect } from '@playwright/test';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import type { TemplateDefinition } from '../../src/templateCatalog';
import type { Project, Slide } from '../../src/domain';

test('browses all 64 actual templates, filters subjects, previews every slide and creates a deck', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Shablonlar', exact: true }).click();
  const catalog = page.getByTestId('template-catalog');
  await expect(catalog.locator('.catalog-card')).toHaveCount(64);
  await page
    .locator('.catalog-categories')
    .getByRole('button', { name: /Biologiya/ })
    .click();
  await expect(catalog.locator('.catalog-card')).toHaveCount(4);
  await catalog.getByRole('button', { name: 'Genetik kod shablonini ko‘rish' }).click();
  const dialog = page.getByRole('dialog', { name: 'Genetik kod — shablon ko‘rinishi' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.template-filmstrip>button')).toHaveCount(6);
  await dialog.getByRole('button', { name: '2-namuna slayd' }).click();
  await expect(dialog.locator('.template-dialog-stage')).toContainText('Taqdimot yo‘nalishi');
  await dialog.getByRole('button', { name: 'Shu shablonda yaratish' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByPlaceholder('Masalan: Kelajak ta’limi').fill('DNK va genetika');
  await expect(page.getByLabel('Taqdimot shabloni', { exact: true })).toHaveValue('genetic-code');
  await page.getByRole('button', { name: 'Ijodni boshlash' }).click();
  await expect(page.getByTestId('editor-canvas')).toContainText('DNK va genetika');
  await expect(page.locator('.slide-thumb')).toHaveCount(6);
  await page.getByRole('button', { name: 'Eksport', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Loyiha zaxirasi (.json)' }).click();
  const doc = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(doc.templateId).toBe('genetic-code');
  expect(
    doc.slides[0].elements.filter((e: { role: string }) => e.role === 'visual').length,
  ).toBeGreaterThan(15);
  expect(errors).toEqual([]);
});
test('recommends Python GUI design and preserves its style when adding a slide', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Shablonlar', exact: true }).click();
  await page.getByLabel('Shablon tavsiyasi uchun mavzu').fill('Python Tkinter');
  const recommended = page.getByRole('region', { name: 'Mavzuga mos shablonlar' });
  await expect(recommended.locator('.catalog-card').first()).toHaveAttribute(
    'data-template',
    'code-studio',
  );
  await recommended.getByRole('button', { name: 'Python Studio shablonini ko‘rish' }).click();
  const preview = page.getByRole('dialog');
  await expect(preview.locator('.template-dialog-stage')).toContainText('import tkinter');
  await preview.getByRole('button', { name: 'Shu shablonda yaratish' }).click();
  await expect(page.getByPlaceholder('Masalan: Kelajak ta’limi')).toHaveValue('Python Tkinter');
  await page.getByRole('button', { name: 'Ijodni boshlash' }).click();
  await page.getByRole('button', { name: /^2-slayd:/ }).click();
  await expect(page.getByTestId('editor-canvas')).toContainText('Label va Button');
  await page.getByRole('button', { name: 'Slayd qo‘shish', exact: true }).click();
  await expect(page.locator('.slide-thumb')).toHaveCount(7);
  await expect(page.getByTestId('editor-canvas')).toContainText('Python Studio');
});
test('persists favorite templates and handles search with no matches', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Shablonlar', exact: true }).click();
  await page
    .getByRole('button', { name: 'Hujayra atlasi: saralanganlarga qo‘shish', exact: true })
    .click();
  await page.getByRole('button', { name: /Saralanganlar/ }).click();
  await expect(page.getByTestId('template-catalog').locator('.catalog-card')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: 'Shablonlar', exact: true }).click();
  await page.getByRole('button', { name: /Saralanganlar/ }).click();
  await expect(page.getByTestId('template-catalog').locator('.catalog-card')).toHaveCount(1);
  await page.getByLabel('Shablonlarni qidirish').fill('QWERZX-no-template');
  await expect(page.getByText('Mos shablon topilmadi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Barcha shablonlarni ko‘rsatish' }).click();
  await expect(page.getByTestId('template-catalog').locator('.catalog-card')).toHaveCount(64);
});
test('uses subject recommendation in the new project dialog and exports vector PowerPoint', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Taqdimot yaratish', exact: true }).last().click();
  await page.getByPlaceholder('Masalan: Kelajak ta’limi').fill('Yurak va kardiologiya');
  await expect(page.locator('.create-template-preview')).toContainText('Yurak ritmi');
  await page.getByRole('button', { name: 'Ijodni boshlash' }).click();
  await page.getByRole('button', { name: 'Eksport', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PowerPoint (.pptx)' }).click();
  const file = await download;
  const zip = await JSZip.loadAsync(await readFile((await file.path())!));
  expect(await zip.file('ppt/slides/slide1.xml')!.async('string')).toContain(
    'Yurak va kardiologiya',
  );
  expect(Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))).toHaveLength(
    6,
  );
});
test('template catalog and preview remain usable at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Menyu', exact: true }).click();
  await page.getByRole('button', { name: 'Shablonlar', exact: true }).click();
  await expect(page.getByTestId('template-catalog').locator('.catalog-card')).toHaveCount(64);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Tadqiqot atlasi shablonini ko‘rish' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Keyingi namuna' }).click();
  await expect(page.getByRole('dialog').locator('.template-page-controls')).toContainText('2 / 6');
  await page.getByRole('button', { name: 'Shablon oynasini yopish' }).click();
});

test('fits all preset text into its rendered boxes across 384 slides and long topic covers', async ({
  page,
}) => {
  await page.goto('/');
  const report = await page.evaluate(async () => {
    const catalogPath = '/src/templateCatalog.ts',
      templatesPath = '/src/templates.ts';
    const { templateCatalog } = (await import(catalogPath)) as {
      templateCatalog: TemplateDefinition[];
    };
    const { createTemplateProject, templateCover } = (await import(templatesPath)) as {
      createTemplateProject: (title: string, id: string) => Project;
      templateCover: (t: TemplateDefinition, title: string) => Slide;
    };
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-10000px;top:0;width:1280px';
    document.body.appendChild(container);
    const failures: string[] = [];
    let checked = 0;
    const longTitle =
      'Zamonaviy tadqiqot usullari, nazariy yondashuvlar va amaliy kuzatuvlarning taqqoslanishi hamda muhokamasi'
        .repeat(2)
        .slice(0, 160);
    try {
      for (const t of templateCatalog) {
        const p = createTemplateProject(t.name, t.id);
        const slides = [...p.slides, templateCover(t, longTitle)];
        for (let i = 0; i < slides.length; i++)
          for (const e of slides[i].elements) {
            if (e.kind !== 'text') continue;
            const el = document.createElement('div');
            el.className = 'slide-element';
            Object.assign(el.style, {
              width: e.w + 'px',
              height: e.h + 'px',
              fontSize: e.fontSize + 'px',
              fontFamily: e.fontFamily,
              fontWeight: e.bold ? '700' : '400',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.2',
            });
            el.textContent = e.text;
            container.appendChild(el);
            checked++;
            if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2)
              failures.push(`${t.id} / ${i + 1} / ${e.text.slice(0, 60)}`);
            el.remove();
          }
      }
    } finally {
      container.remove();
    }
    return { checked, failures };
  });
  expect(report.checked).toBeGreaterThan(2900);
  expect(report.failures).toEqual([]);
});

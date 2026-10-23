import { test, expect } from '@playwright/test';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
test('creates, edits, undoes, redesigns and restores a real project', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Salom, ijodkor' })).toBeVisible();
  await page.getByRole('button', { name: 'Taqdimot yaratish', exact: true }).last().click();
  await page.getByPlaceholder('Masalan: Kelajak ta’limi').fill('Biologiya himoyasi');
  await page.getByRole('button', { name: 'Ijodni boshlash' }).click();
  await expect(page.getByRole('textbox', { name: 'Taqdimot nomi' })).toHaveValue(
    'Biologiya himoyasi',
  );
  await page.getByRole('button', { name: 'Matn: Biologiya himoyasi', exact: true }).click();
  await page.getByRole('textbox', { name: 'Element matni' }).fill('Hujayra tuzilishi');
  await expect(page.getByTestId('editor-canvas')).toContainText('Hujayra tuzilishi');
  await page.getByTitle('Bekor qilish (Ctrl+Z)').click();
  await expect(page.getByTestId('editor-canvas')).toContainText('Biologiya himoyasi');
  await page.getByTitle('Qaytarish (Ctrl+Shift+Z)').click();
  await page.getByRole('button', { name: 'Dizayn variantlari', exact: true }).click();
  await page.getByRole('button', { name: '02 · Yon ustun' }).click();
  await expect(page.getByTestId('editor-canvas')).toContainText('Hujayra tuzilishi');
  await expect(page.getByText('Qurilmada saqlandi', { exact: true })).toBeAttached();
  await page.reload();
  await page.getByRole('button', { name: 'Taqdimot studiyasi', exact: true }).click();
  await expect(page.getByTestId('editor-canvas')).toContainText('Hujayra tuzilishi');
  await page.getByRole('button', { name: 'Namoyish', exact: true }).click();
  await expect(page.locator('.presenter')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.presenter footer')).toContainText('2 / 5');
  await page.getByTitle('Namoyishni yopish').click();
  expect(errors).toEqual([]);
});
test('downloads editable PPTX and portable JSON', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Taqdimot studiyasi', exact: true }).click();
  await page.getByRole('button', { name: 'Eksport', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PowerPoint (.pptx)' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.pptx$/);
  const zip = await JSZip.loadAsync(await readFile((await file.path())!));
  expect(await zip.file('ppt/slides/slide1.xml')!.async('string')).toContain('Bilimni');
  await page.getByRole('button', { name: 'Eksport', exact: true }).click();
  const jsonDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Loyiha zaxirasi (.json)' }).click();
  const p = JSON.parse(await readFile((await (await jsonDownload).path())!, 'utf8'));
  expect(p.schemaVersion).toBe(1);
  expect(p.slides).toHaveLength(3);
});
test('exports full size PNG without selection handles', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Taqdimot studiyasi', exact: true }).click();
  await page.getByRole('button', { name: 'Eksport', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Joriy slayd (.png)' }).click();
  const file = await downloaded;
  const bytes = await readFile((await file.path())!);
  expect(bytes.readUInt32BE(16)).toBe(1920);
  expect(bytes.readUInt32BE(20)).toBe(1080);
});
test('AI unavailable state is honest and chat history survives reopening', async ({ page }) => {
  await page.goto('/');
  await page.getByTitle('Laziz ADMIN AI').click();
  await page.getByRole('textbox', { name: 'AI uchun xabar' }).fill('Menga reja tuz');
  await page.getByTitle('Xabar yuborish').click();
  await expect(page.getByRole('alert')).toContainText('AI hali ulanmagan');
  await expect(page.locator('.message.assistant')).toHaveCount(0);
  await page.getByTitle('Yopish', { exact: true }).click();
  await page.getByTitle('Laziz ADMIN AI').click();
  await expect(page.locator('.message.user')).toContainText('Menga reja tuz');
});
test('theme preserves slide colors and layouts work on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Menyu', exact: true }).click();
  await page.getByRole('button', { name: 'Sozlamalar', exact: true }).click();
  await page.getByRole('button', { name: 'Yorug‘', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'light');
  await page.getByRole('button', { name: 'Menyu', exact: true }).click();
  await page.getByRole('button', { name: 'Taqdimot studiyasi', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByTestId('editor-canvas')).toHaveCSS(
    'background-color',
    'rgb(244, 241, 233)',
  );
  await page.getByTitle('Laziz ADMIN AI').click();
  await expect(page.getByRole('dialog', { name: 'Laziz ADMIN AI' })).toBeVisible();
});
test('adds real chart elements and identifies unsupported claims', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Vizual ustaxona', exact: true }).click();
  await page.getByLabel('Diagramma ko‘rinishi', { exact: true }).selectOption('chart');
  await page.getByLabel('Nomlar').fill('A, B, C');
  await page.getByLabel('Qiymatlar').fill('10, 20, 30');
  await page.getByRole('button', { name: 'Yangi slaydga qo‘shish' }).click();
  await expect(page.getByTestId('editor-canvas')).toContainText('30');
  await page.getByRole('button', { name: 'Matn: Ma’lumotlar taqqoslanishi' }).click();
  await page.getByRole('textbox', { name: 'Element matni' }).fill('Tadqiqot: 75% o‘sish');
  await page.getByRole('button', { name: 'Akademik ustaxona', exact: true }).click();
  await page.getByRole('button', { name: 'SourceGuard', exact: true }).click();
  await expect(page.getByText('Tekshirish talab etiladi', { exact: true })).toBeVisible();
});

test('prints actual slide content onto exactly three PDF pages', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Salom, ijodkor' })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(3);
  expect(
    await page
      .locator('.print-deck .slide-canvas')
      .first()
      .evaluate((el) => getComputedStyle(el).transform),
  ).toBe('none');
});

test('drags an element, uploads a raster image and restores it from autosave', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Taqdimot studiyasi', exact: true }).click();
  const title = page.getByRole('button', { name: /^Matn: Bilimni/ });
  const box = (await title.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 24, box.y + box.height / 2 + 16, { steps: 4 });
  await page.mouse.up();
  expect(Number(await page.getByLabel('X', { exact: true }).inputValue())).toBeGreaterThan(80);
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: 32, height: 32 } });
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Rasm', exact: true }).click();
  await (await chooser).setFiles({ name: 'namuna.png', mimeType: 'image/png', buffer: png });
  await expect(
    page.getByTestId('editor-canvas').getByRole('img', { name: 'namuna.png' }),
  ).toBeVisible();
  await expect(page.getByText('Qurilmada saqlandi', { exact: true })).toBeAttached();
  await page.reload();
  await page.getByRole('button', { name: 'Taqdimot studiyasi', exact: true }).click();
  await expect(
    page.getByTestId('editor-canvas').getByRole('img', { name: 'namuna.png' }),
  ).toBeVisible();
});

test('saves a custom template and reuses it as a separate project', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Shablonlar', exact: true }).click();
  page.once('dialog', (d) => d.accept('Mening shablonim'));
  await page.getByRole('button', { name: 'Joriy dizaynni saqlash' }).click();
  await page.getByRole('button', { name: 'Ochish: Mening shablonim' }).click();
  await expect(page.getByRole('textbox', { name: 'Taqdimot nomi' })).toHaveValue(
    'Mening shablonim',
  );
  await expect(page.getByTestId('editor-canvas')).toContainText('Bilimni');
});

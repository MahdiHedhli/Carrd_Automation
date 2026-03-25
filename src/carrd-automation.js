/**
 * Carrd.co Playwright Automation
 *
 * Controls the Carrd web interface via browser automation to create,
 * edit, and publish sites using native Carrd tools and controls.
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { mkdir } from 'fs/promises';
import path from 'path';

dotenv.config();

const CARRD_BASE = 'https://carrd.co';
const CARRD_DASHBOARD = `${CARRD_BASE}/dashboard`;
const CARRD_LOGIN = `${CARRD_BASE}/login`;

export class CarrdAutomation {
  constructor(options = {}) {
    this.email = options.email || process.env.CARRD_EMAIL;
    this.password = options.password || process.env.CARRD_PASSWORD;
    this.headless = options.headless ?? (process.env.HEADLESS !== 'false');
    this.slowMo = parseInt(options.slowMo || process.env.SLOW_MO || '50', 10);
    this.screenshotDir = options.screenshotDir || process.env.SCREENSHOT_DIR || './screenshots';
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  // ─── Lifecycle ───────────────────────────────────────────────

  async launch() {
    await mkdir(this.screenshotDir, { recursive: true });

    this.browser = await chromium.launch({
      headless: this.headless,
      slowMo: this.slowMo,
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    this.page = await this.context.newPage();
    return this;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  // ─── Authentication ──────────────────────────────────────────

  async login() {
    if (!this.email || !this.password) {
      throw new Error('CARRD_EMAIL and CARRD_PASSWORD must be set in .env or passed as options');
    }

    await this.page.goto(CARRD_LOGIN, { waitUntil: 'networkidle' });
    await this.screenshot('login-page');

    // Fill login form — selectors may need updating if Carrd changes their UI
    await this.page.fill('input[name="email"], input[type="email"]', this.email);
    await this.page.fill('input[name="password"], input[type="password"]', this.password);
    await this.page.click('button[type="submit"], input[type="submit"]');

    // Wait for dashboard to load
    await this.page.waitForURL('**/dashboard**', { timeout: 15000 });
    await this.screenshot('dashboard');
    return true;
  }

  // ─── Site Management ─────────────────────────────────────────

  async createSite(siteName) {
    await this.page.goto(CARRD_DASHBOARD, { waitUntil: 'networkidle' });

    // Click "New Site" / "+" button
    const newSiteBtn = await this.page.locator(
      'button:has-text("New Site"), a:has-text("New Site"), [data-action="new"], .new-site'
    );
    await newSiteBtn.first().click();
    await this.page.waitForTimeout(2000);
    await this.screenshot('new-site-dialog');

    // Select blank template to start fresh
    const blankTemplate = await this.page.locator(
      '[data-template="blank"], :text("Blank"), .template-blank'
    );
    if (await blankTemplate.count() > 0) {
      await blankTemplate.first().click();
      await this.page.waitForTimeout(2000);
    }

    await this.screenshot('site-editor');
    return { status: 'created', name: siteName };
  }

  async openSite(siteName) {
    await this.page.goto(CARRD_DASHBOARD, { waitUntil: 'networkidle' });

    // Find and click the site by name
    const siteCard = await this.page.locator(`text="${siteName}"`);
    if (await siteCard.count() === 0) {
      throw new Error(`Site "${siteName}" not found on dashboard`);
    }
    await siteCard.first().click();
    await this.page.waitForTimeout(2000);
    await this.screenshot('site-opened');
    return { status: 'opened', name: siteName };
  }

  // ─── Element Operations ──────────────────────────────────────

  /**
   * Add an element to the current site.
   * Carrd element types: text, image, button, icon, video, audio,
   * table, list, form, gallery, timer, embed, widget, divider, container
   */
  async addElement(elementType) {
    // Open the add-element menu
    const addBtn = await this.page.locator(
      'button:has-text("Add"), [data-action="add"], .add-element, [aria-label="Add element"]'
    );
    await addBtn.first().click();
    await this.page.waitForTimeout(1000);

    // Select the element type from the menu
    const elementOption = await this.page.locator(
      `text="${elementType}", [data-element-type="${elementType.toLowerCase()}"]`
    );
    if (await elementOption.count() > 0) {
      await elementOption.first().click();
      await this.page.waitForTimeout(1500);
      await this.screenshot(`added-${elementType}`);
      return { status: 'added', type: elementType };
    }

    throw new Error(`Element type "${elementType}" not found in Carrd's add menu`);
  }

  /**
   * Update text content of a selected element or the most recently added text element.
   */
  async updateText(content, selector) {
    if (selector) {
      await this.page.click(selector);
      await this.page.waitForTimeout(500);
    }

    // Double-click to enter edit mode on text elements
    const textElement = await this.page.locator(
      '.selected, .active-element, [contenteditable], textarea'
    );
    if (await textElement.count() > 0) {
      await textElement.first().dblclick();
      await this.page.waitForTimeout(300);

      // Clear and type new content
      await this.page.keyboard.press('Meta+a');
      await this.page.keyboard.type(content, { delay: 10 });
      await this.screenshot('text-updated');
      return { status: 'updated', content };
    }

    throw new Error('No text element selected or found');
  }

  /**
   * Configure an element's properties via Carrd's properties panel.
   */
  async setElementProperty(propertyName, value) {
    // Look for the property in the side panel / properties area
    const propertyField = await this.page.locator(
      `label:has-text("${propertyName}") + input, ` +
      `label:has-text("${propertyName}") ~ input, ` +
      `[data-property="${propertyName}"] input, ` +
      `[placeholder*="${propertyName}" i]`
    );

    if (await propertyField.count() > 0) {
      await propertyField.first().fill('');
      await propertyField.first().fill(String(value));
      await this.screenshot(`property-${propertyName}`);
      return { status: 'set', property: propertyName, value };
    }

    throw new Error(`Property "${propertyName}" not found in element panel`);
  }

  // ─── Styling ─────────────────────────────────────────────────

  async setSiteStyle(styleOptions = {}) {
    const { backgroundColor, fontFamily, textColor, accentColor } = styleOptions;

    // Open site/page settings
    const settingsBtn = await this.page.locator(
      'button:has-text("Settings"), [data-action="settings"], .site-settings, [aria-label="Settings"]'
    );
    if (await settingsBtn.count() > 0) {
      await settingsBtn.first().click();
      await this.page.waitForTimeout(1000);
    }

    if (backgroundColor) {
      await this._setColorField('background', backgroundColor);
    }
    if (textColor) {
      await this._setColorField('text', textColor);
    }
    if (accentColor) {
      await this._setColorField('accent', accentColor);
    }
    if (fontFamily) {
      await this._setFontFamily(fontFamily);
    }

    await this.screenshot('styling-applied');
    return { status: 'styled', options: styleOptions };
  }

  async _setColorField(fieldName, hexColor) {
    const colorInput = await this.page.locator(
      `input[data-color="${fieldName}"], ` +
      `label:has-text("${fieldName}") ~ input[type="text"], ` +
      `[data-field="${fieldName}"] input`
    );
    if (await colorInput.count() > 0) {
      await colorInput.first().fill(hexColor);
    }
  }

  async _setFontFamily(fontName) {
    const fontSelect = await this.page.locator(
      'select[data-field="font"], label:has-text("Font") ~ select'
    );
    if (await fontSelect.count() > 0) {
      await fontSelect.first().selectOption({ label: fontName });
    }
  }

  // ─── Image Upload ────────────────────────────────────────────

  async uploadImage(imagePath) {
    // Add an image element first if none is selected
    const fileInput = await this.page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.first().setInputFiles(imagePath);
      await this.page.waitForTimeout(3000);
      await this.screenshot('image-uploaded');
      return { status: 'uploaded', path: imagePath };
    }

    throw new Error('No file input found — ensure an image element is selected');
  }

  /**
   * Set image from URL (for elements that support URL-based images).
   */
  async setImageUrl(url) {
    const urlInput = await this.page.locator(
      'input[placeholder*="URL" i], input[data-field="url"], label:has-text("URL") ~ input'
    );
    if (await urlInput.count() > 0) {
      await urlInput.first().fill(url);
      await this.page.waitForTimeout(1000);
      await this.screenshot('image-url-set');
      return { status: 'set', url };
    }

    throw new Error('No URL input found for image element');
  }

  // ─── Sections / Containers ───────────────────────────────────

  async addSection() {
    const addSectionBtn = await this.page.locator(
      'button:has-text("Add Section"), [data-action="add-section"], .add-section'
    );
    if (await addSectionBtn.count() > 0) {
      await addSectionBtn.first().click();
      await this.page.waitForTimeout(1500);
      await this.screenshot('section-added');
      return { status: 'section_added' };
    }

    throw new Error('Add Section button not found');
  }

  // ─── Publishing ──────────────────────────────────────────────

  async saveSite() {
    const saveBtn = await this.page.locator(
      'button:has-text("Save"), [data-action="save"], .save-btn'
    );
    if (await saveBtn.count() > 0) {
      await saveBtn.first().click();
      await this.page.waitForTimeout(2000);
      await this.screenshot('site-saved');
      return { status: 'saved' };
    }

    throw new Error('Save button not found');
  }

  async publishSite(subdomain) {
    // Open publish dialog
    const publishBtn = await this.page.locator(
      'button:has-text("Publish"), [data-action="publish"], .publish-btn'
    );
    if (await publishBtn.count() > 0) {
      await publishBtn.first().click();
      await this.page.waitForTimeout(2000);
    }

    // Set subdomain if provided
    if (subdomain) {
      const subdomainInput = await this.page.locator(
        'input[name="subdomain"], input[placeholder*="subdomain" i], input[data-field="subdomain"]'
      );
      if (await subdomainInput.count() > 0) {
        await subdomainInput.first().fill(subdomain);
      }
    }

    // Confirm publish
    const confirmBtn = await this.page.locator(
      'button:has-text("Publish"), button:has-text("Confirm"), button:has-text("Go Live")'
    );
    await confirmBtn.last().click();
    await this.page.waitForTimeout(3000);
    await this.screenshot('site-published');

    const url = subdomain ? `https://${subdomain}.carrd.co` : null;
    return { status: 'published', url };
  }

  // ─── Form Operations ────────────────────────────────────────

  async addFormElement(formType = 'contact') {
    await this.addElement('Form');
    await this.page.waitForTimeout(1500);

    // Select form type if options appear
    const formOption = await this.page.locator(
      `text="${formType}", [data-form-type="${formType.toLowerCase()}"]`
    );
    if (await formOption.count() > 0) {
      await formOption.first().click();
      await this.page.waitForTimeout(1000);
    }

    await this.screenshot('form-added');
    return { status: 'form_added', type: formType };
  }

  // ─── Button Operations ──────────────────────────────────────

  async addButton(label, url) {
    await this.addElement('Button');
    await this.page.waitForTimeout(1000);

    if (label) {
      await this.updateText(label);
    }
    if (url) {
      await this.setElementProperty('URL', url);
    }

    await this.screenshot('button-added');
    return { status: 'button_added', label, url };
  }

  // ─── Navigation / Multi-page ─────────────────────────────────

  async addPage() {
    const addPageBtn = await this.page.locator(
      'button:has-text("Add Page"), [data-action="add-page"]'
    );
    if (await addPageBtn.count() > 0) {
      await addPageBtn.first().click();
      await this.page.waitForTimeout(1500);
      await this.screenshot('page-added');
      return { status: 'page_added' };
    }

    throw new Error('Add Page button not found — multi-page may require Pro plan');
  }

  // ─── Utility ─────────────────────────────────────────────────

  async screenshot(name) {
    if (this.page) {
      const filePath = path.join(this.screenshotDir, `${name}-${Date.now()}.png`);
      await this.page.screenshot({ path: filePath, fullPage: true });
      return filePath;
    }
  }

  async getCurrentUrl() {
    return this.page?.url();
  }

  /**
   * Generic selector action — useful for clicking arbitrary UI elements
   * when specific methods don't cover a Carrd feature.
   */
  async clickSelector(selector) {
    await this.page.click(selector);
    await this.page.waitForTimeout(500);
    await this.screenshot('click-action');
    return { status: 'clicked', selector };
  }

  /**
   * Wait for a specific element to appear, useful between operations.
   */
  async waitForElement(selector, timeout = 5000) {
    await this.page.waitForSelector(selector, { timeout });
    return { status: 'found', selector };
  }

  /**
   * Get current page content for AI analysis / decision-making.
   */
  async getPageSnapshot() {
    const title = await this.page.title();
    const url = this.page.url();
    const screenshotPath = await this.screenshot('snapshot');
    return { title, url, screenshotPath };
  }
}

export default CarrdAutomation;

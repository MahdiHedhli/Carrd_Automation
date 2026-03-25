/**
 * Claude Integration Layer
 *
 * High-level functions that translate natural language site specs
 * into sequences of CarrdAutomation operations. Designed to be
 * called by Claude (or any AI agent) as tool functions.
 */

import CarrdAutomation from './carrd-automation.js';

/**
 * Create a complete Carrd site from a specification object.
 *
 * @param {Object} spec - Site specification
 * @param {string} spec.name - Site name
 * @param {string} [spec.subdomain] - Subdomain for publishing
 * @param {Object} [spec.styling] - Global styling options
 * @param {string} [spec.styling.backgroundColor] - Hex color
 * @param {string} [spec.styling.textColor] - Hex color
 * @param {string} [spec.styling.accentColor] - Hex color
 * @param {string} [spec.styling.fontFamily] - Font name
 * @param {Array} spec.sections - Array of section definitions
 * @param {boolean} [spec.publish] - Whether to publish after creation
 * @returns {Object} Result with status and site URL
 */
export async function createCarrdSite(spec) {
  const carrd = new CarrdAutomation();
  const log = [];

  try {
    await carrd.launch();
    log.push('Browser launched');

    await carrd.login();
    log.push('Logged in to Carrd');

    await carrd.createSite(spec.name);
    log.push(`Created site: ${spec.name}`);

    // Apply global styling
    if (spec.styling) {
      await carrd.setSiteStyle(spec.styling);
      log.push('Applied site styling');
    }

    // Build each section
    if (spec.sections && spec.sections.length > 0) {
      for (let i = 0; i < spec.sections.length; i++) {
        const section = spec.sections[i];

        // Add a new section for each entry after the first
        if (i > 0) {
          try {
            await carrd.addSection();
            log.push(`Added section ${i + 1}`);
          } catch {
            log.push(`Note: Could not add section ${i + 1}, continuing in current section`);
          }
        }

        await buildSection(carrd, section, log);
      }
    }

    // Save the site
    await carrd.saveSite();
    log.push('Site saved');

    // Publish if requested
    let siteUrl = null;
    if (spec.publish) {
      const result = await carrd.publishSite(spec.subdomain);
      siteUrl = result.url;
      log.push(`Published at: ${siteUrl}`);
    }

    return {
      status: 'success',
      name: spec.name,
      url: siteUrl,
      log,
    };
  } catch (error) {
    log.push(`Error: ${error.message}`);
    return {
      status: 'error',
      error: error.message,
      log,
    };
  } finally {
    await carrd.close();
  }
}

/**
 * Update an existing Carrd site.
 *
 * @param {Object} spec - Update specification
 * @param {string} spec.name - Name of existing site to open
 * @param {Object} [spec.styling] - Updated styling
 * @param {Array} [spec.updates] - Element updates to apply
 * @param {boolean} [spec.publish] - Re-publish after updates
 * @returns {Object} Result with status
 */
export async function updateCarrdSite(spec) {
  const carrd = new CarrdAutomation();
  const log = [];

  try {
    await carrd.launch();
    log.push('Browser launched');

    await carrd.login();
    log.push('Logged in to Carrd');

    await carrd.openSite(spec.name);
    log.push(`Opened site: ${spec.name}`);

    // Apply styling updates
    if (spec.styling) {
      await carrd.setSiteStyle(spec.styling);
      log.push('Updated styling');
    }

    // Apply element updates
    if (spec.updates) {
      for (const update of spec.updates) {
        await applyUpdate(carrd, update, log);
      }
    }

    await carrd.saveSite();
    log.push('Site saved');

    if (spec.publish) {
      await carrd.publishSite(spec.subdomain);
      log.push('Site re-published');
    }

    return { status: 'success', name: spec.name, log };
  } catch (error) {
    log.push(`Error: ${error.message}`);
    return { status: 'error', error: error.message, log };
  } finally {
    await carrd.close();
  }
}

/**
 * Take a screenshot of the current Carrd editor state.
 * Useful for AI agents to visually inspect progress.
 */
export async function inspectSite(siteName) {
  const carrd = new CarrdAutomation();

  try {
    await carrd.launch();
    await carrd.login();
    await carrd.openSite(siteName);
    const snapshot = await carrd.getPageSnapshot();
    return { status: 'success', ...snapshot };
  } catch (error) {
    return { status: 'error', error: error.message };
  } finally {
    await carrd.close();
  }
}

// ─── Internal Helpers ────────────────────────────────────────────

async function buildSection(carrd, section, log) {
  const elements = section.elements || [];

  for (const element of elements) {
    switch (element.type?.toLowerCase()) {
      case 'text':
      case 'heading':
        await carrd.addElement('Text');
        if (element.content) {
          await carrd.updateText(element.content);
        }
        log.push(`Added text: "${element.content?.substring(0, 40)}..."`);
        break;

      case 'image':
        await carrd.addElement('Image');
        if (element.src) {
          if (element.src.startsWith('http')) {
            await carrd.setImageUrl(element.src);
          } else {
            await carrd.uploadImage(element.src);
          }
        }
        log.push(`Added image: ${element.src || 'placeholder'}`);
        break;

      case 'button':
        await carrd.addButton(element.label, element.url);
        log.push(`Added button: "${element.label}"`);
        break;

      case 'form':
        await carrd.addFormElement(element.formType || 'contact');
        log.push(`Added form: ${element.formType || 'contact'}`);
        break;

      case 'divider':
        await carrd.addElement('Divider');
        log.push('Added divider');
        break;

      case 'icon':
        await carrd.addElement('Icon');
        log.push('Added icon');
        break;

      case 'video':
        await carrd.addElement('Video');
        if (element.src) {
          await carrd.setElementProperty('URL', element.src);
        }
        log.push(`Added video: ${element.src || 'placeholder'}`);
        break;

      case 'gallery':
        await carrd.addElement('Gallery');
        log.push('Added gallery');
        break;

      case 'timer':
        await carrd.addElement('Timer');
        log.push('Added timer');
        break;

      case 'list':
        await carrd.addElement('List');
        log.push('Added list');
        break;

      case 'table':
        await carrd.addElement('Table');
        log.push('Added table');
        break;

      case 'embed':
        await carrd.addElement('Embed');
        if (element.code) {
          await carrd.updateText(element.code);
        }
        log.push('Added embed');
        break;

      default:
        log.push(`Unknown element type: ${element.type}`);
    }

    // Apply element-specific properties
    if (element.properties) {
      for (const [key, value] of Object.entries(element.properties)) {
        try {
          await carrd.setElementProperty(key, value);
        } catch {
          log.push(`Could not set property ${key}=${value}`);
        }
      }
    }
  }
}

async function applyUpdate(carrd, update, log) {
  if (update.selector) {
    await carrd.clickSelector(update.selector);
  }

  if (update.text) {
    await carrd.updateText(update.text);
    log.push(`Updated text: "${update.text.substring(0, 40)}..."`);
  }

  if (update.properties) {
    for (const [key, value] of Object.entries(update.properties)) {
      await carrd.setElementProperty(key, value);
      log.push(`Set ${key}=${value}`);
    }
  }
}

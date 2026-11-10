import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot as root } from './project-root.mjs';
import { LOCALES, ROUTES, localePath } from '../src/i18n/config.ts';

const readJson = async (filename) => JSON.parse(await readFile(path.join(root, filename), 'utf8'));
const config = await readJson('project-config.json');
const messages = Object.fromEntries(await Promise.all(LOCALES.map(async (locale) => [locale, await readJson(`src/i18n/${locale}.json`)])));
const dist = path.join(root, 'dist');
const origin = new URL(config.siteUrl).origin;
const read = (filename) => readFile(path.join(dist, filename), 'utf8');
const manifest = JSON.parse(await read('manifest.webmanifest'));
assert.equal(manifest.name, config.name);
assert.equal(manifest.start_url, '/');
assert.equal(manifest.theme_color, '#3b7bdd');
assert(manifest.icons.length > 0, 'Manifest requires at least one supplied logo icon.');
for (const icon of manifest.icons) {
  assert(icon.src.startsWith('/') && !icon.src.includes('..'), 'Manifest icons must use local absolute paths.');
  await access(path.join(dist, icon.src.slice(1)));
}

const robots = await read('robots.txt');
assert.match(robots, /^User-agent: \*$/m);
assert.match(robots, /^Allow: \/$/m);
assert(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
const sitemap = await read('sitemap.xml');
const pageUrl = (path) => `${origin}${path}${path === '/' ? '' : '/'}`;
const escapeHtml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const pages = LOCALES.flatMap((locale) => ROUTES.map((route) => ({ locale, route, path: localePath(locale, route) })));
for (const { locale, route, path: pagePath } of pages) {
  const page = messages[locale].meta.pages[route];
  const label = `${locale} ${route}`;
  assert(sitemap.includes(`<loc>${pageUrl(pagePath)}</loc>`), `Sitemap missing ${label}.`);
  const filename = pagePath === '/' ? 'index.html' : `${pagePath.slice(1)}/index.html`;
  const html = await read(filename);
  assert.match(html, new RegExp(`<html[^>]*lang="${locale}"`), `${label}: document language mismatch.`);
  assert(html.includes(`<title>${escapeHtml(page.title)}</title>`), `${label}: title mismatches the messages.`);
  assert(!html.includes('\u2014'), `${label}: em dash in published HTML.`);
  assert(html.includes(`<link rel="canonical" href="${pageUrl(pagePath)}"`), `${label}: canonical URL missing.`);
  for (const code of LOCALES) assert(html.includes(`hrefLang="${code}"`) || html.includes(`hreflang="${code}"`), `${label}: alternate link for ${code} missing.`);
  assert(html.includes(`<meta name="robots" content="${config.sitePrivate !== false ? 'noindex, follow' : 'index, follow'}"`), `${label}: indexing directive mismatches configuration.`);
  assert.match(html, /<meta name="description" content="[^"]{40,}"/, `${label}: description missing.`);
  assert(!/https:\/\/fonts\.(googleapis|gstatic)\.com/.test(html), `${label}: remote font request in HTML.`);
  const ldJson = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
  assert(ldJson.some((item) => item['@graph']?.some((entity) => entity['@type'] === 'Organization')), `${label}: Organization structured data missing.`);
  const graph = ldJson.flatMap(item => item['@graph'] || []);
  // The security contact answers in Spanish whatever the language of the page.
  for (const entity of graph.filter(entity => entity['@type'] === 'Organization')) assert.deepEqual(entity.contactPoint.availableLanguage, ['es'], `${label}: unsupported language advertised.`);
  for (const entity of graph.filter(entity => entity['@type'] === 'WebSite')) assert.equal(entity.inLanguage, locale, `${label}: WebSite language mismatch.`);
  const mainText = (html.match(/<main\b[\s\S]*?<\/main>/)?.[0] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert(mainText.length > (route === '/' ? 180 : 600), `${label}: content must be prerendered.`);
  assert.match(mainText, /security@stanelabs\.com/, `${label}: contact email must be readable without JavaScript.`);
  assert(!/data-cfemail|email-decode\.min\.js/.test(html), `${label}: obfuscated email in export.`);
  assert(html.includes(`href="${localePath(locale, '/security')}`), `${label}: internal links must stay in the page language.`);
  if (route === '/') {
    assert(!/<details\b|role="tab(?:list|panel)?"/.test(html), 'Homepage information must not be hidden behind tabs or disclosures.');
    const entries = html.match(/<article\b[^>]*class="faq-entry"[\s\S]*?<\/article>/g) || [];
    assert.equal(entries.length, 3, 'FAQ must contain three visible answers.');
    for (const item of entries) assert(item.replace(/<h3\b[\s\S]*?<\/h3>/, '').replace(/<[^>]+>/g, '').length > 70, 'FAQ answer missing from HTML.');
    for (const id of ['cyber', 'opsec', 'data']) assert.match(html, new RegExp(`<article[^>]*id="${id}"[^>]*class="service-card"`), `${id}: service information must be directly available.`);
    assert.match(html, /<form[^>]*method="post"/, 'Contact form must not leak personal data into query parameters.');
  }
}

const security = await read('.well-known/security.txt');
assert(security.endsWith('\n'), 'security.txt requires a final line separator.');
const fields = security.split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => {
  const divider = line.indexOf(':');
  assert(divider > 0, 'security.txt contains a malformed field.');
  return [line.slice(0, divider), line.slice(divider + 1).trim()];
});
const values = (field) => fields.filter(([key]) => key === field).map(([, value]) => value);
assert(values('Contact').includes(`${origin}/security`));
if (config.securityEmail) assert(values('Contact').includes(`mailto:${config.securityEmail}`));
assert.equal(values('Expires').length, 1);
const expiry = Date.parse(values('Expires')[0]);
assert(Number.isFinite(expiry) && expiry > Date.now(), 'security.txt expiry has passed: renew it before release.');
assert.equal(values('Canonical')[0], `${origin}/.well-known/security.txt`);
assert.equal(values('Policy')[0], `${origin}/security`);
assert.equal(values('Preferred-Languages')[0], 'es');
await access(path.join(dist, 'sculpture/knot.bin'));
await assert.rejects(access(path.join(dist, 'security.txt')), { code: 'ENOENT' });
console.log(`Verified ${pages.length} prerendered pages in ${LOCALES.length} languages, SEO metadata, manifest icons and security.txt.`);

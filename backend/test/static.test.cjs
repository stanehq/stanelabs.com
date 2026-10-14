const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
const { mkdtemp, mkdir, writeFile, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('hashed assets are immutable while HTML stays fresh, untransformed and uses local fonts', { timeout: 25000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'stanelabs-static-'));
  assert(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
  await mkdir(path.join(root, '_next/static/chunks'), { recursive: true });
  await writeFile(path.join(root, '_next/static/chunks/fixture-012345.js'), '/* fixture */');
  await writeFile(path.join(root, 'index.html'), '<!doctype html><p>security@stanelabs.com</p>');
  const listener = createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const child = spawn(process.execPath, [path.join(__dirname, '../dist/main.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'test', WEB_ROOT: root, SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: '' },
    stdio: 'ignore',
  });
  const origin = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      try { ready = (await fetch(`${origin}/api/health`)).ok; } catch { /* Starting. */ }
      if (ready || child.exitCode !== null) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(ready, 'Static server did not start.');
    const asset = await fetch(`${origin}/_next/static/chunks/fixture-012345.js`);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('cache-control'), /max-age=31536000/);
    assert.match(asset.headers.get('cache-control'), /immutable/);
    const page = await fetch(origin);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('cache-control'), /max-age=0/);
    assert.match(page.headers.get('cache-control'), /no-transform/);
    assert(!page.headers.get('cache-control').includes('immutable'));
    const policy = page.headers.get('content-security-policy');
    assert.match(policy, /font-src 'self'(?:;|$)/);
    assert(!/googleapis|gstatic/.test(policy));
    assert.match(await page.text(), /security@stanelabs\.com/);
    assert.equal((await fetch(`${origin}/_next/static/chunks/missing.js`)).status, 404);
  } finally {
    child.kill();
    if (child.exitCode === null) await new Promise(resolve => child.once('exit', resolve));
    await rm(root, { recursive: true, force: true });
  }
});

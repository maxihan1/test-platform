// trace 계약 검사(traceContract.test.ts)가 진짜 Playwright 로 돌리는 케이스. 화면 · API 는 이 파일이 띄운 작은 서버다

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'TRACE-001',
  name: 'trace 에 네트워크 · 조작 · 콘솔이 남는다',
  precondition: ['없음'],
  params: null,
  expected: null,
});

const 화면 = `<!doctype html><html><body>
<img src="/logo.png">
<input id="pw" type="password" aria-label="비밀번호">
<button onclick="fetch('/api/login?token=t0ken-abc', { method: 'POST', body: JSON.stringify({ password: 'pa55word', name: 'kim' }) }).then((r) => r.json()).then(() => fetch('/api/fail')).then((r) => r.json()).then(() => { console.error('주문 실패 pa55word'); console.log('지나가는 말'); setTimeout(() => { throw new Error('잡히지 않은 오류') }) })">보내기</button>
</body></html>`;

test(spec, async ({ page }) => {
  const 서버 = createServer((req, res) => {
    if (req.url === '/') return res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(화면);
    if (req.url === '/logo.png') return res.writeHead(200, { 'content-type': 'image/png' }).end('');
    if (req.url?.startsWith('/api/login')) return res.writeHead(200, { 'content-type': 'application/json' }).end('{"accessToken":"s3cret-tok","ok":true}');
    if (req.url === '/api/fail') return res.writeHead(500, { 'content-type': 'application/json' }).end('{"error":"boom","password":"pa55word"}');
    res.writeHead(404).end();
  });
  await new Promise<void>((done) => 서버.listen(0, '127.0.0.1', done));
  const 주소 = `http://127.0.0.1:${(서버.address() as AddressInfo).port}`;
  try {
    await test.step('화면을 연다', async () => {
      await page.goto(`${주소}/`);
    });
    await test.step('비밀번호를 넣고 보낸다', async () => {
      await page.getByLabel('비밀번호').fill('pa55word');
      const 화면오류 = page.waitForEvent('pageerror');
      await page.getByRole('button', { name: '보내기' }).click();
      await 화면오류;
      await verify('보내기 버튼이 보인다', await page.getByRole('button', { name: '보내기' }).isVisible(), true);
    });
  } finally {
    서버.close();
  }
});

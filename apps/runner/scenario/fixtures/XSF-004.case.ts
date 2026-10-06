// 시나리오 실측용 가짜 케이스 — 로그인하고 글을 만들고 주입 스크립트를 건 뒤 finally 에서 page.request 상대 주소로 지운다. 표본에서 가장 흔한 삭제 꼴이다 (apps/runner/scenario/e2e.test.ts)

import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'XSF-004',
  name: '글을 만들고 끝에 지운다',
  precondition: [],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 글번호: number | undefined;
  try {
    await test.step('로그인한다', async () => {
      const 응답 = await page.request.post('/api/login');
      await verify('로그인된다', 응답.status(), 200, { blocker: true });
    });

    await test.step('글을 만든다', async () => {
      const 응답 = await page.request.post('/api/posts', { data: { 제목: '첫 글' } });
      글번호 = ((await 응답.json()) as { id: number }).id;
      await verify('글이 만들어진다', 응답.status(), 201);
    });

    await test.step('화면에 표시를 남긴다', async () => {
      await page.addInitScript(() => {
        (window as unknown as { 새어나옴: boolean }).새어나옴 = true;
      });
      await page.goto('/');
      await verify('표시가 걸린다', await page.evaluate(() => (window as unknown as { 새어나옴?: boolean }).새어나옴 === true), true);
    });
  } finally {
    if (글번호 !== undefined) await page.request.delete(`/api/posts/${글번호}`);
  }
});

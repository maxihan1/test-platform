// 시나리오 실측용 가짜 케이스 — 준비 절차가 장바구니를 비우고 글을 만든다. 조립이 비우기를 막고 만들기를 앞 글 고치기로 바꾼다. 판정 뒤 같은 요청은 손대지 않는다 (apps/runner/scenario/e2e.test.ts)

import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'XSF-006',
  name: '장바구니를 비우고 글을 만든다',
  precondition: [],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  await test.step('장바구니를 비우고 글을 만든다', async () => {
    const 비움 = await page.request.delete('/api/cart');
    await verify('비우기가 받아진다', await 비움.text(), '{}', { blocker: true });
    const 만듦 = await page.request.post('/api/posts', { data: { 제목: '둘째 글' } });
    await verify('글이 준비된다', 만듦.status(), 200, { blocker: true });
  });

  await test.step('준비된 글을 본다', async () => {
    const 응답 = await page.request.get('/api/posts/812');
    await verify('앞 글이 둘째 글로 고쳐졌다', ((await 응답.json()) as { 제목?: string }).제목, '둘째 글');
  });

  await test.step('판정 뒤 비우기를 다시 한다', async () => {
    const 비움 = await page.request.delete('/api/cart');
    await verify('모킹 응답이 온다', await 비움.text(), '{"모킹":true}');
  });
});

// 시나리오 실측용 가짜 케이스 — 꽂아 받은 글 번호를 로그인한 채 request 로 읽고, 앞 부품의 주입 스크립트가 안 샜는지 · 새 창이 디바이스 설정으로 열렸는지 본다 (apps/runner/scenario/e2e.test.ts)

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'XSF-005',
  name: '앞에서 만든 글을 본다',
  precondition: [],
  params: z.object({ 글번호: z.number().default(0) }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  await test.step('글을 읽는다', async () => {
    const 응답 = await request.get(`/api/posts/${params.글번호}`);
    await verify('로그인한 채 글이 읽힌다', 응답.status(), 200);
  });

  await test.step('앞 부품 표시가 안 샜다', async () => {
    await page.goto('/');
    await verify('주입 스크립트 표시가 없다', await page.evaluate(() => (window as unknown as { 새어나옴?: boolean }).새어나옴 === true), false);
    await verify('디바이스 사용자 에이전트로 열렸다', (await page.evaluate(() => navigator.userAgent)).includes('HeadlessChrome'), false);
  });
});

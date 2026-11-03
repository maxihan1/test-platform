import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-FN-122',
  name: '캐릭터 검색 응답이 서버 오류로 실패하면 오류 알림이 보인다',
  precondition: ['캐릭터 검색 응답은 가짜 응답(모킹) 500 이다'],
  techniques: ['동등 분할'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 백오피스화면(page);
  const 검색주소 = (주소: URL): boolean => 주소.pathname === '/admin/characters';
  const 실패응답 = { status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'aso 모킹 실패' }) };

  await test.step('백오피스를 키 없이 연다', async () => {
    await 화면.열기();
    await verify('「X-Admin-Key」 칸이 비어 있다', (await 화면.키칸.inputValue()) === '', true, { blocker: true });
  });

  await test.step('맞는 키를 저장하고 「검색」을 누른다', async () => {
    await page.context().route(검색주소, (길) => 길.fulfill(실패응답));
    try {
      await 화면.키저장하고목록기다리기(params.password ?? '');
      await 화면.검색('', '');
      const 알림 = await verify('오류 알림이 보인다', await 화면.오류알림.isVisible(), true);
      const 칸 = await verify('「캐릭터 이름 일부」 칸이 그대로 보인다', await 화면.이름칸.isVisible(), true);
      await verify('캐릭터 검색 응답이 서버 오류로 실패하면 오류 알림이 보인다', 알림 && 칸, true);
    } finally {
      await page.context().unroute(검색주소);
    }
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-UI-046',
  name: '확률·결과 고정 탭에 「드랍 확률」의 「봇 전리품」 · 「악명 봇」 칸이 보인다',
  precondition: ['맞는 키를 저장했다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 백오피스화면(page);
  const 키 = params.password ?? '';

  await test.step('백오피스를 열고 맞는 키를 저장한다', async () => {
    await 화면.열기();
    const 응답 = await 화면.키저장하고목록기다리기(키);
    await verify('키 저장 뒤 캐릭터 검색 응답이 성공이다', 응답.ok(), true, { blocker: true });
  });

  await test.step('「확률·결과 고정」을 연다', async () => {
    await 화면.확률탭열기();
    const 봇 = await verify('「봇 전리품」 칸이 보인다', await 화면.봇전리품칸.isVisible(), true);
    const 악명 = await verify('「악명 봇」 칸이 보인다', await 화면.악명봇칸.isVisible(), true);
    await verify('확률·결과 고정 탭에 「드랍 확률」의 「봇 전리품」 · 「악명 봇」 칸이 보인다', 봇 && 악명, true);
  });
});

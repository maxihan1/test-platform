import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-UI-045',
  name: '확률·결과 고정 탭에 「강화 확률」 표의 목표 「+4」 「+5」 「+6」 「+7」 「+8」 「+9」 「+10」 줄이 차례로 보인다',
  precondition: ['맞는 키를 저장했다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    목표들: z.string().describe('강화 확률 표의 목표 칸들').default('+4, +5, +6, +7, +8, +9, +10'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 백오피스화면(page);
  const 키 = params.password ?? '';

  await test.step('백오피스를 열고 맞는 키를 저장한다', async () => {
    await 화면.열기();
    const 응답 = await 화면.키저장하고목록기다리기(키);
    await verify('키 저장 뒤 캐릭터 검색 응답이 성공이다', 응답.ok(), true, { blocker: true });
  });

  await test.step('「확률·결과 고정」을 연다', async () => {
    await 화면.확률탭열기();
    await verify('확률·결과 고정 탭에 「강화 확률」 표의 목표 「+4」 「+5」 「+6」 「+7」 「+8」 「+9」 「+10」 줄이 차례로 보인다', (await 화면.강화확률목표칸들.allInnerTexts()).join(', '), expected.목표들);
  });
});

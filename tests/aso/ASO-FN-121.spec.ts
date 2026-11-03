import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-FN-121',
  name: '캐릭터 줄을 누르면 상세 제목에 「<이름> · #<ID> · 계정 <계정 이름>」이 보인다',
  precondition: ['맞는 키를 저장했다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 백오피스화면(page);

  await test.step('백오피스를 열고 맞는 키를 저장한다', async () => {
    await 화면.열기();
    const 응답 = await 화면.키저장하고목록기다리기(params.password ?? '');
    await verify('키 저장 뒤 캐릭터 검색 응답이 성공이다', 응답.ok(), true, { blocker: true });
  });

  await test.step('목록 첫 캐릭터 줄을 누른다', async () => {
    const 줄 = 화면.캐릭터줄들.first();
    const [번호 = '', 이름 = '', 계정 = ''] = await 화면.줄칸글(줄);
    const 계정이름 = 계정.replace(/ \(#\d+\)$/, '');
    await 화면.캐릭터열기(줄);
    await verify('캐릭터 줄을 누르면 상세 제목에 「<이름> · #<ID> · 계정 <계정 이름>」이 보인다', await 화면.상세제목.innerText(), `${이름} · #${번호} · 계정 ${계정이름}`);
  });
});

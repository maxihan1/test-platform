import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-UI-040',
  name: '캐릭터 탭에 목록 표 머리 「ID」 「이름」 「계정」 「직업」 「Lv」 「골드」 「구역」 「성향」이 차례로 보인다',
  precondition: ['맞는 키를 저장했다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    표머리: z.string().describe('목록 표 머리 칸 이름들').default('ID, 이름, 계정, 직업, Lv, 골드, 구역, 성향'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 백오피스화면(page);

  await test.step('백오피스를 열고 맞는 키를 저장한다', async () => {
    await 화면.열기();
    const 응답 = await 화면.키저장하고목록기다리기(params.password ?? '');
    await verify('키 저장 뒤 캐릭터 검색 응답이 성공이다', 응답.ok(), true, { blocker: true });
  });

  await test.step('캐릭터 탭을 본다', async () => {
    await verify('캐릭터 탭에 목록 표 머리 「ID」 「이름」 「계정」 「직업」 「Lv」 「골드」 「구역」 「성향」이 차례로 보인다', (await 화면.목록머리칸들.allInnerTexts()).join(', '), expected.표머리);
  });
});

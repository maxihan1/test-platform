import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-FN-129',
  name: 'ID 칸을 비우고 「저장」을 누르면 스폰 목록에 ID 가 빈 줄이 생기지 않는다',
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

  await test.step('「스폰」 탭을 연다', async () => {
    await 화면.스폰탭열기();
    await verify('스폰 목록에 줄이 보인다', (await 화면.스폰줄들.count()) > 0, true, { blocker: true });
  });

  await test.step('ID 칸을 비우고 「저장」을 누른다', async () => {
    await 화면.스폰저장('', 'Beginner', 'Imp', '35', '104');
    await 화면.스폰탭다시열기();
    const 빈줄 = (await 화면.스폰ID칸들.allInnerTexts()).filter((아이디) => 아이디.trim() === '');
    await verify('ID 칸을 비우고 「저장」을 누르면 스폰 목록에 ID 가 빈 줄이 생기지 않는다', 빈줄.length, 0);
  });
});

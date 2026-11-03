import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-UI-041',
  name: '캐릭터 상세에 표 줄 「레벨」 「골드」 「위치」 「성향」 「능력치」 「PK」가 차례로 보인다',
  precondition: ['캐릭터 상세를 열었다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    표줄: z.string().describe('상세 표 줄 이름들').default('레벨, 골드, 위치, 성향, 능력치, PK'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 백오피스화면(page);

  await test.step('백오피스를 열고 맞는 키를 저장한다', async () => {
    await 화면.열기();
    const 응답 = await 화면.키저장하고목록기다리기(params.password ?? '');
    await verify('키 저장 뒤 캐릭터 검색 응답이 성공이다', 응답.ok(), true, { blocker: true });
  });

  await test.step('목록 첫 캐릭터의 상세를 연다', async () => {
    await 화면.캐릭터열기(화면.캐릭터줄들.first());
    await verify('캐릭터 상세 표가 보인다', await 화면.상세표줄들.first().isVisible(), true, { blocker: true });
  });

  await test.step('상세 표를 본다', async () => {
    await verify('캐릭터 상세에 표 줄 「레벨」 「골드」 「위치」 「성향」 「능력치」 「PK」가 차례로 보인다', (await 화면.상세표이름칸들.allInnerTexts()).join(', '), expected.표줄);
  });
});

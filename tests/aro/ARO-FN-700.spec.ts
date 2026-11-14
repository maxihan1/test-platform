import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-700',
  name: '아이템 흐름 검색 칸에 「체력 물약」을 적으면 아이템 이름에 「체력 물약」이 든 줄만 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    검색어: z.string().min(1).describe('아이템 흐름 검색 칸에 적을 낱말 — 아이템 흐름에 있는 아이템 이름').default('체력 물약'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);

  await test.step('운영자 계정으로 로그인하고 「기록」의 「아이템 흐름」 탭을 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await 화면.탭누르기('아이템 흐름');
    await verify('「기록」 표에 줄이 보인다', (await 화면.줄들.count()) > 0, true, { blocker: true });
  });

  await test.step('아이템 흐름 검색 칸에 「체력 물약」을 적는다', async () => {
    await 화면.검색(params.검색어);
    const 아이템들 = (await 화면.칸들('아이템 · 재화').allInnerTexts()).map((글) => 글.trim());
    const 보인다 = await verify('「체력 물약」이 든 줄이 보인다', 아이템들.length > 0, true);
    const 모두맞다 = await verify('보이는 줄의 아이템 이름에 「체력 물약」이 들어 있다', 아이템들.filter((글) => !글.includes(params.검색어)).join(', '), '');
    await verify('아이템 흐름 검색 칸에 「체력 물약」을 적으면 아이템 이름에 「체력 물약」이 든 줄만 보인다', 보인다 && 모두맞다, true);
  });
});

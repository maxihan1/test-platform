import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-085',
  name: '「/users?q=qa_player2」를 새로 고침하면 검색 칸에 「qa_player2」가 남고 표에 qa_player2 줄만 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    찾을아이디: z.string().min(1).describe('찾을 아이디 — 아이디가 정확히 하나만 맞는 값, 공백 없이').default('qa_player2'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
  });

  await test.step('「유저 · 제재」 화면을 열어 유저 표를 확인한다', async () => {
    await 화면.열기();
    await verify('유저 표가 보인다', await 화면.유저표.isVisible(), true, { blocker: true });
  });

  await test.step('「/users?q=qa_player2」를 열고 새로 고침한다', async () => {
    await 화면.열기(`?q=${encodeURIComponent(params.찾을아이디)}`);
    await 화면.새로고침();
    const 칸에남은글 = await 화면.검색칸.inputValue();
    const 보이는아이디 = (await 화면.아이디칸들.allInnerTexts()).map((x) => x.trim()).join(', ');
    const 검색칸 = await verify('새로 고친 뒤 검색 칸에 「qa_player2」가 남는다', 칸에남은글, params.찾을아이디);
    const 표 = await verify('새로 고친 뒤 표에 qa_player2 줄만 보인다', 보이는아이디, params.찾을아이디);
    await verify('「/users?q=qa_player2」를 새로 고침하면 검색 칸에 「qa_player2」가 남고 표에 qa_player2 줄만 보인다', 검색칸 && 표, true);
  });
});

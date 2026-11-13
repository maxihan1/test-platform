import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-184',
  name: '맞는 유저가 없는 검색어 「zz없는유저zz」를 적으면 「조건에 맞는 유저가 없습니다」가 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    없는검색어: z.string().min(1).describe('검색어 — 아이디 · 이메일 · 계정 번호 · 캐릭터 이름 어디에도 없는 글').default('zz없는유저zz'),
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

  await test.step('유저 검색 칸에 「zz없는유저zz」를 적는다', async () => {
    await 화면.검색(params.없는검색어);
    await verify('맞는 유저가 없는 검색어 「zz없는유저zz」를 적으면 「조건에 맞는 유저가 없습니다」가 보인다', await 화면.없음안내.isVisible(), true);
  });
});

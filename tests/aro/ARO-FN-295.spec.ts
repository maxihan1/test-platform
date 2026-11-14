import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험계정, 이력없는계정찾기 } from './helpers/sanction.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정번호 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-295',
  name: '제재 이력이 없는 계정의 상세 패널을 열면 「제재 이력이 없습니다」가 보인다',
  precondition: ['제재 이력이 없는 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  let 아이디: string | null = null;
  let 계정 = 0;

  await test.step('운영자 계정으로 로그인하고 제재 이력이 없는 계정을 찾는다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    아이디 = await 이력없는계정찾기(page, [시험계정]);
    if (아이디 !== null) 계정 = await 계정번호(page, 아이디);
  });

  await test.step('제재 이력이 없는 계정이 있는지 확인한다', async () => {
    await verify('제재 이력이 없는 계정이 있다', 아이디 !== null, true, { blocker: true });
  });

  await test.step('그 계정의 상세 패널을 연다', async () => {
    await 화면.상세열기(계정);
    await verify('제재 이력이 없는 계정의 상세 패널을 열면 「제재 이력이 없습니다」가 보인다', await 화면.제재없음안내.isVisible(), true);
  });
});

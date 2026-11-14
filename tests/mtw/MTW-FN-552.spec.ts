import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-552',
  name: '요청만 보낸 잠긴 계정 프로필을 열면 버튼이 「요청 취소」로 보인다',
  techniques: ['상태 전이'],
  precondition: ['일반 회원이 yuna_locked 에 팔로우 요청만 보낸 상태다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.메뉴.그려질때까지();
    await verify('왼쪽 메뉴에 「홈」 링크가 보인다', await 프로필.메뉴.링크('홈').isVisible(), true, { blocker: true });
  });

  await test.step('일반 회원으로 yuna_locked 프로필을 연다', async () => {
    await 프로필.열기('yuna_locked');
    await 프로필.버튼그려질때까지();
    await verify('프로필 머리에 팔로우 관련 버튼이 보인다', await 프로필.팔로우버튼.isVisible(), true, { blocker: true });
    await verify('요청만 보낸 잠긴 계정 프로필을 열면 버튼이 「요청 취소」로 보인다', await 프로필.팔로우버튼.innerText(), '요청 취소');
  });
});

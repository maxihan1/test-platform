import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-187',
  name: '「요청 취소」를 누르면 「{이름} 님에 대한 팔로우 요청을 취소할까요?」 확인 창이 뜬다',
  precondition: ['일반 회원이 yuna_locked 에 팔로우 요청만 보낸 상태다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);

  await test.step('일반 회원으로 로그인하고 yuna_locked 프로필을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기('yuna_locked');
    await verify('프로필 머리에 「요청 취소」 버튼이 보인다', await 프로필.팔로우버튼.innerText(), '요청 취소', { blocker: true });
  });

  await test.step('yuna_locked 프로필에서 「요청 취소」를 누른다', async () => {
    await 프로필.팔로우누르기();
    const 떴다 = await 프로필.확인창제목.filter({ hasText: '@yuna_locked 님에 대한 팔로우 요청을 취소할까요?' }).waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('「요청 취소」를 누르면 「{이름} 님에 대한 팔로우 요청을 취소할까요?」 확인 창이 뜬다', 떴다, true);
    await 프로필.확인창취소.click();
  });
});

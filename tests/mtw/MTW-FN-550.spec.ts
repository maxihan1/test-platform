import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정찾기API } from './helpers/api.helper.js';
import { 관계바꾸기API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-550',
  name: '잠긴 계정의 「팔로우 요청」을 누르면 버튼이 「요청 취소」로 바뀐다',
  precondition: ['관리자로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  let 대상id = '';

  await test.step('관리자로 로그인하고 yuna_locked 프로필을 연다', async () => {
    await 로그인하기(page, params.adminId, params.adminPassword);
    대상id = (await 계정찾기API(page, 'yuna_locked')).id;
    await 관계바꾸기API(page, 대상id, 'unfollow');
    await 프로필.열기('yuna_locked');
    await 프로필.버튼그려질때까지();
    await verify('프로필 머리에 「팔로우 요청」 버튼이 보인다', await 프로필.팔로우버튼.innerText(), '팔로우 요청', { blocker: true });
  });

  try {
    await test.step('관리자로 yuna_locked 프로필에서 「팔로우 요청」을 누른다', async () => {
      await 프로필.팔로우누르기();
      const 바뀜 = await 프로필.팔로우버튼.filter({ hasText: '요청 취소' }).waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('잠긴 계정의 「팔로우 요청」을 누르면 버튼이 「요청 취소」로 바뀐다', 바뀜, true);
    });
  } finally {
    if (대상id !== '') await 관계바꾸기API(page, 대상id, 'unfollow');
  }
});

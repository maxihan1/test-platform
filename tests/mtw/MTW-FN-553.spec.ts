import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정찾기API, 내계정API } from './helpers/api.helper.js';
import { 관계바꾸기API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-553',
  name: '나를 팔로우하는 계정의 프로필을 열면 버튼이 「맞팔로우」로 보인다',
  precondition: ['일회용 · 계정 이동 대상 계정이 두 번째 사용자를 팔로우해 두었다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    moveId: z.string().describe('계정 이동 대상 이메일').optional().meta({ secret: true, account: '일회용 · 계정 이동 대상' }),
    movePassword: z.string().describe('계정 이동 대상 암호').optional().meta({ secret: true, account: '일회용 · 계정 이동 대상' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  let 이동아이디 = '';
  let 이동id = '';
  let 두번째id = '';
  let 두번째로그인 = false;

  try {
    await test.step('일회용 · 계정 이동 대상 계정이 두 번째 사용자를 팔로우한다', async () => {
      await 로그인하기(page, params.moveId, params.movePassword);
      const 이동 = await 내계정API(page);
      이동아이디 = 이동.acct;
      이동id = 이동.id;
      두번째id = (await 계정찾기API(page, 'qa_user2')).id;
      const 관계 = await 관계바꾸기API(page, 두번째id, 'follow');
      await verify('일회용 · 계정 이동 대상 계정이 두 번째 사용자를 팔로우한다', 관계.following, true, { blocker: true });
    });

    await test.step('두 번째 사용자로 그 계정 프로필을 연다', async () => {
      await 로그인하기(page, params.secondId, params.secondPassword);
      두번째로그인 = true;
      await 프로필.열기(이동아이디);
      await 프로필.버튼그려질때까지();
      await verify('나를 팔로우하는 계정의 프로필을 열면 버튼이 「맞팔로우」로 보인다', await 프로필.팔로우버튼.innerText(), '맞팔로우');
    });
  } finally {
    if (이동id !== '' && 두번째id !== '') {
      if (!두번째로그인) await 로그인하기(page, params.secondId, params.secondPassword);
      await 관계바꾸기API(page, 이동id, 'remove_from_followers');
    }
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정찾기API } from './helpers/api.helper.js';
import { 관계API, 관계바꾸기API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-562',
  name: '뮤트한 계정 프로필의 「뮤트 해제」를 누르면 뮤트가 풀린다',
  precondition: ['두 번째 사용자가 troll_kim 을 뮤트해 두었다', '두 번째 사용자가 troll_kim 을 차단해 두었다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  let 대상id = '';

  try {
    await test.step('두 번째 사용자가 troll_kim 을 뮤트해 두고 프로필을 연다', async () => {
      await 로그인하기(page, params.secondId, params.secondPassword);
      대상id = (await 계정찾기API(page, 'troll_kim')).id;
      await 관계바꾸기API(page, 대상id, 'unblock');
      await 관계바꾸기API(page, 대상id, 'mute');
      await 프로필.열기('troll_kim');
      await verify('프로필 머리에 「뮤트 해제」 버튼이 보인다', await 프로필.팔로우버튼.innerText(), '뮤트 해제', { blocker: true });
    });

    await test.step('troll_kim 프로필에서 「뮤트 해제」를 누른다', async () => {
      await 프로필.팔로우누르기();
      await 프로필.팔로우버튼.filter({ hasText: /^팔로우$/ }).waitFor();
      await verify('뮤트한 계정 프로필의 「뮤트 해제」를 누르면 뮤트가 풀린다', (await 관계API(page, 대상id)).muting, false);
    });

    await test.step('두 번째 사용자가 troll_kim 을 차단해 두고 프로필을 연다', async () => {
      await 관계바꾸기API(page, 대상id, 'block');
      await 프로필.열기('troll_kim');
      await verify('프로필 머리에 「차단 해제」 버튼이 보인다', await 프로필.팔로우버튼.innerText(), '차단 해제', { blocker: true });
    });

    await test.step('troll_kim 프로필에서 「차단 해제」를 누른다', async () => {
      await 프로필.팔로우누르기();
      await 프로필.차단해제확인.click();
      await 프로필.팔로우버튼.filter({ hasText: /^팔로우$/ }).waitFor();
      await verify('「차단 해제」 뒤에는 차단도 풀린다', (await 관계API(page, 대상id)).blocking, false);
    });
  } finally {
    if (대상id !== '') {
      await 관계바꾸기API(page, 대상id, 'unmute');
      await 관계바꾸기API(page, 대상id, 'unblock');
    }
  }
});

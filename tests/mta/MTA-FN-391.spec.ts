import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 뮤트풀기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 뮤트차단시트 } from './pages/mute-block-sheet.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-391',
  name: '뮤트한 사람 프로필에서 동작 버튼을 누르면 「Muted」 배지가 먼저 사라진다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 시트 = new 뮤트차단시트(driver);
  try {
    await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });
    await test.step('mute_jang 을 뮤트한 뒤 프로필 동작 버튼을 누른다', async () => {
      await 프로필열기(driver, 'mute_jang');
      await 프로필.메뉴열기();
      await 프로필.메뉴항목누르기('Mute account');
      await 시트.단추누르기('뮤트');
      await verify('뮤트한 프로필에 「Muted」 배지가 보인다', await 뜰때까지(driver, 프로필.배지('Muted'), 10_000), true, { blocker: true });
      await 프로필.동작누르기();
      await verify('뮤트한 사람 프로필에서 동작 버튼을 누르면 「Muted」 배지가 먼저 사라진다', await 사라질때까지(driver, 프로필.배지('Muted'), 10_000), true);
    });
  } finally {
    await 뮤트풀기(driver, 'mute_jang');
  }
});

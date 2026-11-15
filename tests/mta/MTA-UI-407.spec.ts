import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글이될때까지읽기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-407',
  name: '내 프로필 메뉴 「계정 설정」을 누르면 제목 「@qa_user1@mastodon.maxihan.com」 계정 설정이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    계정줄글: z.string().describe('계정 설정 제목').default('@qa_user1@mastodon.maxihan.com'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 설정 = new 설정화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('내 프로필 메뉴에서 「계정 설정」을 누른다', async () => {
    await 홈.탭.누르기('프로필');
    await verify('내 프로필 화면이 그려진다', await 프로필.그려질때까지(), true, { blocker: true });
    await 프로필.메뉴열기();
    await 프로필.메뉴항목누르기('계정 설정');
    await verify('내 프로필 메뉴 「계정 설정」을 누르면 제목 「@qa_user1@mastodon.maxihan.com」 계정 설정이 열린다', await 글이될때까지읽기(driver, 설정.계정제목, expected.계정줄글), expected.계정줄글);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글이될때까지읽기, 설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-391',
  name: '설정 「계정」에 「@qa_user1@mastodon.maxihan.com」 줄이 보이고 누르면 계정 설정이 열린다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    계정줄글: z.string().describe('설정 「계정」의 내 계정 줄').default('@qa_user1@mastodon.maxihan.com'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('설정 「계정」의 내 계정 줄을 누른다', async () => {
    await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
    const 줄 = await verify('설정 「계정」에 「@qa_user1@mastodon.maxihan.com」 줄이 보인다', await 뜰때까지(driver, 설정.줄(expected.계정줄글), 10_000), true);
    await driver.$(설정.줄(expected.계정줄글)).click();
    const 열림 = await verify('계정 설정이 열린다', await 글이될때까지읽기(driver, 설정.계정제목, expected.계정줄글), expected.계정줄글);
    await verify('설정 「계정」에 「@qa_user1@mastodon.maxihan.com」 줄이 보이고 누르면 계정 설정이 열린다', 줄 && 열림, true);
  });
});

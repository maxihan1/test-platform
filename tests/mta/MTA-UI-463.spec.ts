import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정줄 } from './helpers/app.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정전환시트 } from './pages/account-switcher.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-463',
  name: '계정 전환 시트에 계정 줄의 이름과 「@qa_user1@mastodon.maxihan.com」이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 시트 = new 계정전환시트(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('하단 「프로필」 탭을 길게 누른다', async () => {
    await 시트.프로필탭길게누르기();
    await verify('계정 전환 시트가 뜬다', await 시트.떴나(), true, { blocker: true });
    const 이름 = await verify('계정 줄의 이름이 보인다', (await 시트.이름읽기()).length > 0, true);
    const 사용자명 = await verify('계정 줄에 「@qa_user1@mastodon.maxihan.com」이 보인다', (await 시트.사용자명읽기()).includes(계정줄(params.loginId ?? '')), true);
    await verify('계정 전환 시트에 계정 줄의 이름과 「@qa_user1@mastodon.maxihan.com」이 보인다', 이름 && 사용자명, true);
  });
});

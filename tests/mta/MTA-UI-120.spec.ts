import { defineCase, test, verify } from '@platform/kit';
import { 글자들, 될때까지, 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-120',
  name: '실시간 피드에 이 서버 공개 글이 1건 이상 보인다',
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

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('홈 드롭다운에서 「실시간 피드」를 고른다', async () => {
    await 홈.피드고르기('실시간 피드');
    await verify('실시간 피드 안내가 보인다', await 뜰때까지(driver, 홈.전체글자포함('이것들은 해당 서버'), 20_000), true, { blocker: true });
    await verify('실시간 피드에 이 서버 공개 글이 1건 이상 보인다', await 될때까지(driver, async () => (await 글자들(driver, 홈.첫시간줄)).length >= 1, 20_000), true);
  });
});

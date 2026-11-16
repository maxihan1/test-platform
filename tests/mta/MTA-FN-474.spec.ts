import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈으로 } from './helpers/nav.helper.js';
import { 설정열기, 설정줄열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-474',
  name: '「게시물 상호작용 수」를 끄면 글 카드 푸터 숫자가 보이지 않는다',
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
  const 설정 = new 설정화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('「게시물 상호작용 수」를 끄고 홈 글 카드를 본다', async () => {
    await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
    await verify('「디스플레이」 설정이 열린다', await 설정줄열기(driver, '디스플레이'), true, { blocker: true });
    if (await 설정.켜졌나(3)) await 설정.스위치바꾸기(3);
    await verify('「게시물 상호작용 수」가 꺼진다', await 될때까지(driver, async () => !(await 설정.켜졌나(3)), 5_000), true, { blocker: true });
    await 홈으로(driver);
    await 홈.목록고르기('개발 소식');
    await verify('글 카드 푸터의 좋아요 버튼이 보인다', await 뜰때까지(driver, 홈.첫좋아요, 20_000), true, { blocker: true });
    await verify('「게시물 상호작용 수」를 끄면 글 카드 푸터 숫자가 보이지 않는다', await driver.$(홈.첫좋아요수).getText(), '');
  });
});

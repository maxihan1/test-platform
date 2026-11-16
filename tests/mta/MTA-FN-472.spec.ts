import { defineCase, test, verify } from '@platform/kit';
import { 될때까지, 뜰때까지, 보이나, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈으로, 프로필열기 } from './helpers/nav.helper.js';
import { 설정열기, 설정줄열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글카드 } from './pages/post-card.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-472',
  name: '「열람 주의 표시」를 끄면 내용 경고 글 본문이 「무시하고 표시」 없이 펼쳐 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('내용 경고 글이 있는 시드 계정 사용자명').default('seoyeon_books'),
  }),
  expected: z.object({
    무시글: z.string().describe('접힌 내용 경고 글의 버튼 글').default('무시하고 표시'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 카드 = new 글카드(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('설정 「디스플레이」에서 「열람 주의 표시」를 끈다', async () => {
    await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
    await verify('「디스플레이」 설정이 열린다', await 설정줄열기(driver, '디스플레이'), true, { blocker: true });
    if (await 설정.켜졌나(1)) await 설정.스위치바꾸기(1);
    await verify('「열람 주의 표시」가 꺼진다', await 될때까지(driver, async () => !(await 설정.켜졌나(1)), 5_000), true, { blocker: true });
  });

  await test.step('「열람 주의 표시」를 끄고 내용 경고 글을 연다', async () => {
    await 홈으로(driver);
    await 프로필열기(driver, params.사용자명);
    await verify('내용 경고 글 카드가 보인다', await 뜰때까지(driver, 카드.굴려서아이디('spoiler_title'), 25_000), true, { blocker: true });
    const 무시없음 = await verify('「무시하고 표시」가 보이지 않는다', await 사라질때까지(driver, 홈.전체글자포함(expected.무시글), 10_000), true);
    const 본문 = await verify('글 본문이 보인다', await 보이나(driver, 홈.글본문들), true);
    await verify('「열람 주의 표시」를 끄면 내용 경고 글 본문이 「무시하고 표시」 없이 펼쳐 보인다', 무시없음 && 본문, true);
  });
});

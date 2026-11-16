import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글카드 } from './pages/post-card.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-161',
  name: '진행 중 투표 카드에서 항목을 고르면 꺼져 있던 「투표」가 켜진다',
  platforms: ['android'],
  held: '보류 — 앱 화면에서 투표 카드 항목 주소를 못 읽었다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    고를항목: z.string().min(1).describe('고를 투표 항목 글 — minjun_dev 프로필의 진행 중 투표 글에 있는 항목'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('진행 중 투표 카드에서 항목 하나를 고른다', async () => {
    await 프로필열기(driver, 'minjun_dev');
    await verify('진행 중 투표 카드에 고를 항목이 보인다', await 뜰때까지(driver, 카드.굴려서글자(params.고를항목), 25_000), true, { blocker: true });
    await verify('「투표」가 꺼져 있다', await 카드.투표버튼켜졌나(), false, { blocker: true });
    await 카드.투표항목누르기(params.고를항목);
    await verify('진행 중 투표 카드에서 항목을 고르면 꺼져 있던 「투표」가 켜진다', await 카드.투표버튼켜졌나(), true);
  });
});

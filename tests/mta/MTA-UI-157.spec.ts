import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-157',
  name: '남의 글 더보기에 「민준 팔로우 해제」 · 「민준 뮤트」 · 「민준 차단」 · 「민준 신고」가 보인다',
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
  const 글상세 = new 글상세화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('내가 팔로우하는 minjun_dev 글 더보기를 연다', async () => {
    await 글상세열기(driver, 'minjun_dev', '마스토돈 4.7 인용 기능');
    await 글상세.더보기열기();
    const 팔로우해제 = await verify('「민준 팔로우 해제」가 보인다', await 글상세.메뉴.뜰때까지('민준 팔로우 해제'), true);
    const 뮤트 = await verify('「민준 뮤트」가 보인다', await 글상세.메뉴.뜰때까지('민준 뮤트'), true);
    const 차단 = await verify('「민준 차단」이 보인다', await 글상세.메뉴.뜰때까지('민준 차단'), true);
    const 신고 = await verify('「민준 신고」가 보인다', await 글상세.메뉴.뜰때까지('민준 신고'), true);
    await verify('남의 글 더보기에 「민준 팔로우 해제」 · 「민준 뮤트」 · 「민준 차단」 · 「민준 신고」가 보인다', 팔로우해제 && 뮤트 && 차단 && 신고, true);
    await driver.back();
  });
});

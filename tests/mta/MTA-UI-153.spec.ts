import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 내프로필에서글열기 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-153',
  name: '내 고정 글 더보기에 「프로필에서 고정 해제」 · 「수정」 · 「삭제」 · 「대화 뮤트하기」가 보인다',
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

  await test.step('내 고정 글 더보기를 연다', async () => {
    await 내프로필에서글열기(driver, '창밖 풍경 한 장');
    await 글상세.더보기열기();
    const 고정해제 = await verify('「프로필에서 고정 해제」가 보인다', await 글상세.메뉴.뜰때까지('프로필에서 고정 해제'), true);
    const 수정 = await verify('「수정」이 보인다', await 글상세.메뉴.뜰때까지('수정'), true);
    const 삭제 = await verify('「삭제」가 보인다', await 글상세.메뉴.뜰때까지('삭제'), true);
    const 뮤트 = await verify('「대화 뮤트하기」가 보인다', await 글상세.메뉴.뜰때까지('대화 뮤트하기'), true);
    await verify('내 고정 글 더보기에 「프로필에서 고정 해제」 · 「수정」 · 「삭제」 · 「대화 뮤트하기」가 보인다', 고정해제 && 수정 && 삭제 && 뮤트, true);
    await driver.back();
  });
});

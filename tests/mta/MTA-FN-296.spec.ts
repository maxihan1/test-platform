import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글, 내글쓰기, 내프로필에서글열기, 내글지우기 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-296',
  name: '내 글 더보기에서 「인용 가능한 사용자 변경」을 누르면 인용 가능한 사용자를 고르는 시트가 뜬다',
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
  const 본문 = 표시글('인용 정책');

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  try {
    await test.step('내 새 글 더보기에서 「인용 가능한 사용자 변경」을 누른다', async () => {
      await 내글쓰기(driver, 본문);
      await 내프로필에서글열기(driver, 본문);
      await 글상세.더보기열기();
      await 글상세.메뉴.고르기('인용 가능한 사용자 변경');
      await verify('내 글 더보기에서 「인용 가능한 사용자 변경」을 누르면 인용 가능한 사용자를 고르는 시트가 뜬다', await 뜰때까지(driver, 글상세.인용정책칸, 10_000), true);
      await driver.$(글상세.인용정책취소).click();
    });
  } finally {
    await 내글지우기(driver, 본문);
  }
});

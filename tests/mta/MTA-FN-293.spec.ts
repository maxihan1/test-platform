import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글쓰기닫기, 글자나설명이뜰때까지 } from './helpers/timeline.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글, 내글쓰기, 내프로필에서글열기, 내글지우기 } from './helpers/post.helper.js';
import { 부스트시트 } from './pages/boost-sheet.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-293',
  name: '내 글 부스트 시트에서 「인용하기」를 누르면 글쓰기에 인용 카드가 붙는다',
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
  const 글쓰기 = new 글쓰기화면(driver);
  const 시트 = new 부스트시트(driver);
  const 본문 = 표시글('인용 붙이기');

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  try {
    await test.step('내 새 글 상세의 부스트 시트에서 「인용하기」를 누른다', async () => {
      await 내글쓰기(driver, 본문);
      await 내프로필에서글열기(driver, 본문);
      await driver.$(글상세.부스트).click();
      await 시트.항목누르기('인용하기');
      const 열림 = await verify('인용 글쓰기가 열린다', await 글쓰기.그려질때까지(), true);
      const 취소단추 = await verify('인용 카드를 떼는 「인용 취소」가 보인다', await 글자나설명이뜰때까지(driver, '인용 취소', 10_000), true);
      await verify('내 글 부스트 시트에서 「인용하기」를 누르면 글쓰기에 인용 카드가 붙는다', 열림 && 취소단추, true);
    });
  } finally {
    await 글쓰기닫기(driver);
    await 내글지우기(driver, 본문);
  }
});

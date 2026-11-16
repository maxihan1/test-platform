import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글, 내글쓰기, 내프로필에서글열기, 내글지우기 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-160',
  name: '「게시물 삭제 전 묻기」가 켜져 있을 때 내 글 더보기에서 「삭제」를 누르면 「정말로 이 게시물을 삭제하시겠습니까?」와 「삭제」 · 「취소」 창이 뜬다',
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
  const 글상세 = new 글상세화면(driver);
  const 창 = new 확인창(driver);
  const 본문 = 표시글('삭제 창 확인');

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  try {
    await test.step('내 새 글 더보기에서 「삭제」를 누른다', async () => {
      await 내글쓰기(driver, 본문);
      await 내프로필에서글열기(driver, 본문);
      await 글상세.더보기열기();
      await 글상세.메뉴.고르기('삭제');
      const 묻기 = await verify('「정말로 이 게시물을 삭제하시겠습니까?」가 보인다', await 뜰때까지(driver, 창.안의글자('정말로 이 게시물을 삭제하시겠습니까?'), 10_000), true);
      const 삭제 = await verify('「삭제」 버튼이 보인다', await driver.$(창.확인버튼).getText(), '삭제');
      const 취소 = await verify('「취소」 버튼이 보인다', await driver.$(창.취소버튼).getText(), '취소');
      await verify('「게시물 삭제 전 묻기」가 켜져 있을 때 내 글 더보기에서 「삭제」를 누르면 「정말로 이 게시물을 삭제하시겠습니까?」와 「삭제」 · 「취소」 창이 뜬다', 묻기 && 삭제 && 취소, true);
      await 창.취소();
    });
  } finally {
    await 내글지우기(driver, 본문);
  }
});

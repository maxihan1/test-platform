import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 알림글 } from './components/toast.component.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글, 내글쓰기, 내프로필에서글열기, 내글지우기 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-197',
  name: '내 글을 고정하면 스낵바 「게시물이 고정되었습니다.」가, 해제하면 「게시물 고정이 해제되었습니다.」가 보인다',
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
  const 알림 = new 알림글(driver);
  const 본문 = 표시글('고정 확인');

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  try {
    await test.step('내 새 글을 고정했다가 해제한다', async () => {
      await 내글쓰기(driver, 본문);
      await 내프로필에서글열기(driver, 본문);
      await 글상세.더보기열기();
      await 뜰때까지(driver, 글상세.메뉴.항목포함('고정'), 10_000);
      await driver.$(글상세.메뉴.항목포함('고정')).click();
      const 고정 = await verify('스낵바 「게시물이 고정되었습니다.」가 보인다', await 알림.스낵바글(), '게시물이 고정되었습니다.');
      await 글상세.더보기열기();
      await 뜰때까지(driver, 글상세.메뉴.항목포함('고정 해제'), 10_000);
      await driver.$(글상세.메뉴.항목포함('고정 해제')).click();
      const 해제 = await verify('스낵바 「게시물 고정이 해제되었습니다.」가 보인다', await 알림.스낵바글(), '게시물 고정이 해제되었습니다.');
      await verify('내 글을 고정하면 스낵바 「게시물이 고정되었습니다.」가, 해제하면 「게시물 고정이 해제되었습니다.」가 보인다', 고정 && 해제, true);
    });
  } finally {
    await 내글지우기(driver, 본문);
  }
});

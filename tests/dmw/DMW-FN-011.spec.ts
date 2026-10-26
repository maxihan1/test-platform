import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 알림글지우기, 읽지않은알림만들기 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-011',
  name: '다른 회원이 내 글에 댓글을 달면 알림 종 옆에 읽지 않은 알림 수 「1」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 홈 = new 홈화면(page);
  let 글번호: number | undefined;
  await 안내창막기(page);
  await 일회용회원으로로그인(page);

  try {
    await test.step('다른 회원이 내 글에 댓글을 단 뒤 홈 화면을 연다', async () => {
      글번호 = await 읽지않은알림만들기(page.request, request);
      await 홈.열기();
      await verify('일회용 회원으로 로그인해 있다', await 홈.머리.로그아웃.isVisible(), true, { blocker: true });
      await 홈.머리.알림수.waitFor();
      await verify('다른 회원이 내 글에 댓글을 달면 알림 종 옆에 읽지 않은 알림 수 「1」이 보인다', await 홈.머리.알림수.innerText(), '1');
    });
  } finally {
    await 알림글지우기(page.request, 글번호);
  }
});

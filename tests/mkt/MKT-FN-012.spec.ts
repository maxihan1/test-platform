import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자, 글만들기, 글지우기, 댓글달기, 읽지않은알림수 } from './helpers/data.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-012',
  name: '내 글에 새 댓글이 달리면 종 옆에 읽지 않은 알림 수 「1」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 쓴 글에 다른 회원이 댓글을 달았다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 홈 = new 홈화면(page);
  const 상태: { 글쓴이?: 회원정보; 댓글쓴이?: 회원정보; 글번호?: number } = {};

  try {
    await test.step('새 회원이 쓴 글에 다른 회원이 댓글을 단다', async () => {
      await 방해창막기(page);
      상태.글쓴이 = await 새회원으로로그인(page.request);
      상태.글번호 = await 글만들기(page.request, { title: 고유글자('알림 시험 글'), content: '알림을 받으려고 쓴 글입니다' });
      상태.댓글쓴이 = await 새회원으로로그인(request);
      await 댓글달기(request, 상태.글번호, '알림 시험 댓글입니다');
      await verify('읽지 않은 알림이 하나 있다', await 읽지않은알림수(page.request), 1, { blocker: true });
    });

    await test.step('글쓴 회원으로 홈 화면을 연다', async () => {
      await 홈.열기();
      await 홈.머리글.알림수.filter({ hasText: '1' }).waitFor();
      await verify('내 글에 새 댓글이 달리면 종 옆에 읽지 않은 알림 수 「1」이 보인다', await 홈.머리글.알림수.innerText(), '1');
    });
  } finally {
    if (상태.글번호 !== undefined) await 글지우기(page.request, 상태.글번호);
    if (상태.글쓴이) await 회원정리(page.request, 상태.글쓴이);
    if (상태.댓글쓴이) await 회원정리(request, 상태.댓글쓴이);
  }
});

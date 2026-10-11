import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 둘째아이디, API로그인, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 알림모두읽기 } from './helpers/home.helper.js';
import { 글만들기, 글지우기, 댓글달기, 댓글지우기, 지난글치우기, 테스트글머리 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-003',
  name: '홈 화면을 연 채 10초가 지나면 새로 고치지 않아도 알림 수가 새로 보인다',
  platforms: ['desktop'],
  precondition: ['회원으로 로그인해 있다', '두 번째 회원이 내 글에 댓글을 달았다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  let 글번호: number | undefined;
  let 댓글번호: number | undefined;

  try {
    await test.step('회원으로 로그인해 내 글을 만든다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request);
      await 알림모두읽기(page.request);
      글번호 = await 글만들기(page.request, { title: `${테스트글머리} 알림 시험 글` });
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('홈 화면을 연 채 두 번째 회원이 내 글에 댓글을 달고 10초를 기다린다', async () => {
      await 홈.열기();
      await 머리.알림종.waitFor();
      await verify('댓글이 달리기 전에는 알림 수가 보이지 않는다', await 머리.알림수.isVisible(), false, { blocker: true });
      await API로그인(request, 둘째아이디, params.password ?? '');
      댓글번호 = await 댓글달기(request, 글번호 ?? 0, '알림 시험 댓글입니다');
      await 머리.알림수.waitFor({ timeout: 12000 });
      await verify('홈 화면을 연 채 10초가 지나면 새로 고치지 않아도 알림 수가 새로 보인다', await 머리.알림수.isVisible(), true);
    });

    await test.step('두 번째 회원이 내 글에 댓글을 단 뒤 홈 화면을 연다', async () => {
      await 홈.열기();
      await 머리.알림수.waitFor();
      await verify(
        '내 글에 새 댓글이 달린 뒤 홈 화면을 열면 알림 종 옆에 읽지 않은 알림 수가 보인다',
        { 보임: await 머리.알림수.isVisible(), 숫자: await 머리.알림수.innerText() },
        { 보임: true, 숫자: '1' },
      );
    });

    await test.step('머리글 알림 종을 누른다', async () => {
      const 읽음응답 = page.waitForResponse((r) => r.url().endsWith('/api/notifications/read'));
      await 머리.알림종.click();
      await 읽음응답;
      await verify('알림 종을 누르면 알림 목록이 펼쳐진다', await 머리.알림목록.isVisible(), true);
      await verify('알림 목록을 열면 알림 종 옆 알림 수가 보이지 않는다', await 머리.알림수.isVisible(), false);
    });
  } finally {
    if (댓글번호 !== undefined) await 댓글지우기(request, 댓글번호);
    if (글번호 !== undefined) await 글지우기(page.request, 글번호);
    await 알림모두읽기(page.request);
  }
});

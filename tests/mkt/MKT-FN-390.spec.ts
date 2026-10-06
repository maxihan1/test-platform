import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 로그아웃요청, 임시회원가입, 임시회원정보, 임시회원지우기 } from './components/account.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 관리자화면 } from './pages/admin.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-390',
  name: '일반 회원이 관리자 주소로 들어오면 「권한이 없습니다」 화면이 보인다',
  techniques: ['동등 분할'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 관리자 = new 관리자화면(page);
  const 로그인 = new 로그인화면(page);
  const 헤더 = new 머리글(page);
  const 회원 = 임시회원정보();

  try {
    await test.step('로그인 요청으로 새 회원을 만들어 로그인한다', async () => {
      await 임시회원가입(page.request, 회원);
      await API로그인(page.request, 회원.loginId, 회원.password);
    });

    await test.step('새로 만든 회원으로 로그인해 있는지 확인한다', async () => {
      await 안내창끄기(page);
      await page.goto('/');
      await 헤더.로그아웃버튼.waitFor();
      await verify('로그인한 머리글에 인사말이 보인다', await 헤더.인사.isVisible(), true, { blocker: true });
    });

    await test.step('일반 회원으로 관리자 주소 「/admin」을 연다', async () => {
      await 관리자.열기();
      await 관리자.권한없음제목.waitFor();
      await verify('일반 회원이 관리자 주소로 들어오면 「권한이 없습니다」 화면이 보인다', await 관리자.권한없음제목.isVisible(), true);
    });

    await test.step('비회원으로 관리자 주소 「/admin」을 연다', async () => {
      await 로그아웃요청(page.request);
      await 관리자.열기();
      await 로그인.제목.waitFor();
      await verify(
        '비회원이 관리자 주소를 열면 로그인 화면이 열리고 주소에 「next=/admin」이 붙는다',
        { 로그인화면: await 로그인.제목.isVisible(), 다음주소: decodeURIComponent(page.url()).includes('next=/admin') },
        { 로그인화면: true, 다음주소: true },
      );
    });
  } finally {
    await 임시회원지우기(page.request, 회원);
  }
});

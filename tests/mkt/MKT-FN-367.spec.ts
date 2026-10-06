import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 임시회원가입, 임시회원정보, 임시회원지우기 } from './components/account.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 로그인화면 } from './pages/login.page.js';
import { 회원탈퇴화면 } from './pages/my-withdraw.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-367',
  name: '「탈퇴하기」를 누르면 브라우저 확인 창 「정말 탈퇴하시겠습니까?」가 뜬다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원탈퇴화면(page);
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

    await test.step('「위 내용을 확인했습니다」를 켜고 「탈퇴하기」를 누른다', async () => {
      let 문구 = '';
      page.once('dialog', async (대화) => {
        문구 = 대화.message();
        await 대화.dismiss();
      });
      await 화면.열기();
      await 화면.확인체크.check();
      await 화면.탈퇴하기버튼.click();
      await verify('「탈퇴하기」를 누르면 브라우저 확인 창 「정말 탈퇴하시겠습니까?」가 뜬다', 문구, '정말 탈퇴하시겠습니까?');
    });

    await test.step('브라우저 확인 창에서 확인을 누른다', async () => {
      page.once('dialog', async (대화) => {
        await 대화.accept();
      });
      await 화면.탈퇴하기버튼.click();
      await 헤더.로그인링크.waitFor();
      await verify(
        '탈퇴를 확인하면 로그아웃되어 홈 화면 머리글에 「로그인」이 보인다',
        { 경로: new URL(page.url()).pathname, 로그인보임: await 헤더.로그인링크.isVisible() },
        { 경로: '/', 로그인보임: true },
      );
    });

    await test.step('탈퇴한 아이디와 비밀번호로 로그인한다', async () => {
      await 로그인.열기();
      await 로그인.로그인하기(회원.loginId, 회원.password);
      await 로그인.오류문구기다리기();
      await verify(
        '탈퇴한 아이디로는 로그인되지 않고 로그인 화면에 머문다',
        { 경로: new URL(page.url()).pathname, 로그아웃보임: await 헤더.로그아웃버튼.isVisible() },
        { 경로: '/login', 로그아웃보임: false },
      );
    });
  } finally {
    await 임시회원지우기(page.request, 회원);
  }
});

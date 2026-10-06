import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 임시회원가입, 임시회원정보, 임시회원지우기 } from './components/account.component.js';
import { 토스트 } from './components/feedback.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-540',
  name: '회원정보 수정에서도 관심 분야 넷째를 켜면 토스트 「관심 분야는 최대 3개까지 선택할 수 있습니다」가 보인다',
  techniques: ['경계값 분석'],
  unconfirmed: '기획서와 다름 — 차이 D23 · D24: 회원정보 수정의 관심 분야 3개 · 이름 10자 제한이 기획서에 없다 (작성 요청 5873)',
  precondition: ['새로 만든 회원으로 로그인해 있다', '비밀번호 재확인을 마쳤다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원정보수정화면(page);
  const 헤더 = new 머리글(page);
  const 알림 = new 토스트(page);
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

    await test.step('회원정보 수정 화면에서 비밀번호를 다시 입력한다', async () => {
      await 화면.열기();
      await 화면.재확인하기(회원.password);
    });

    await test.step('비밀번호 재확인을 마쳤는지 확인한다', async () => {
      await verify('비밀번호 재확인을 마치면 회원정보 수정 칸이 열린다', await 화면.이름칸.isVisible(), true, { blocker: true });
    });

    await test.step('회원정보 수정 관심 분야에서 넷째를 켠다', async () => {
      await 화면.관심분야('패션').check();
      await 화면.관심분야('전자기기').check();
      await 화면.관심분야('도서').check();
      await 화면.관심분야('식품').click();
      await verify(
        '회원정보 수정에서도 관심 분야 넷째를 켜면 토스트 「관심 분야는 최대 3개까지 선택할 수 있습니다」가 보인다',
        await 알림.문구('관심 분야는 최대 3개까지 선택할 수 있습니다').first().isVisible(),
        true,
      );
    });

    await test.step('회원정보 수정 이름 칸에 11자를 적는다', async () => {
      await 화면.이름칸.fill('가나다라마바사아자차카');
      await verify('회원정보 수정 이름 칸에 11자를 적으면 10자까지만 들어간다', await 화면.이름칸.inputValue(), '가나다라마바사아자차');
    });
  } finally {
    await 임시회원지우기(page.request, 회원);
  }
});

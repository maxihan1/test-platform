import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 임시회원가입, 임시회원정보, 임시회원지우기 } from './components/account.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 회원탈퇴화면 } from './pages/my-withdraw.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-369',
  name: '「위 내용을 확인했습니다」를 켜지 않으면 「탈퇴하기」가 눌리지 않는다',
  techniques: ['결정 테이블'],
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원탈퇴화면(page);
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

    await test.step('회원 탈퇴 화면에서 「위 내용을 확인했습니다」를 켜지 않는다', async () => {
      await 화면.열기();
      await verify('「위 내용을 확인했습니다」가 꺼져 있다', await 화면.확인체크.isChecked(), false, { blocker: true });
      await verify('「위 내용을 확인했습니다」를 켜지 않으면 「탈퇴하기」가 눌리지 않는다', await 화면.탈퇴하기버튼.isEnabled(), false);
    });
  } finally {
    await 임시회원지우기(page.request, 회원);
  }
});

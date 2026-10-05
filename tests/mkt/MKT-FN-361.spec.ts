import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 임시회원가입, 임시회원정보, 임시회원지우기, 새이름 } from './components/account.component.js';
import { 토스트 } from './components/feedback.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-361',
  name: '비밀번호가 맞으면 이름 · 이메일 · 휴대폰 · 관심 분야 칸이 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원정보수정화면(page);
  const 헤더 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 회원 = 임시회원정보();
  const 고친이름 = 새이름();

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

    await test.step('비밀번호를 다시 적고 「비밀번호 확인」을 누른다', async () => {
      await 화면.열기();
      await 화면.재확인하기(회원.password);
      await verify(
        '비밀번호가 맞으면 이름 · 이메일 · 휴대폰 · 관심 분야 칸이 보인다',
        [await 화면.이름칸.isVisible(), await 화면.이메일칸.isVisible(), await 화면.휴대폰칸.isVisible(), await 화면.관심분야묶음.isVisible()],
        [true, true, true, true],
      );
      await verify(
        '아이디 칸은 흐리게 보이고 고칠 수 없다',
        (await 화면.아이디칸.isDisabled()) && (await 화면.배경색(화면.아이디칸)) !== (await 화면.배경색(화면.이름칸)),
        true,
      );
    });

    await test.step('이름을 고치고 「저장」을 누른 뒤 화면을 새로 고친다', async () => {
      await 화면.이름칸.fill(고친이름);
      await 화면.저장버튼.click();
      await 알림.기다리기('저장되었습니다');
      await page.reload();
      await 헤더.인사.waitFor();
      await verify('고친 이름이 머리글에 「{고친 이름}님」으로 보인다', await 헤더.인사.innerText(), `${고친이름}님`);
    });
  } finally {
    await 임시회원지우기(page.request, 회원);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원정보, 임시회원지우기 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 가입완료화면 } from './pages/signup-done.page.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-115',
  name: '새 회원 정보로 가입하면 가입 완료 화면에 「{이름}님, 가입을 환영합니다」가 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);
  const 완료 = new 가입완료화면(page);
  const 회원 = 임시회원정보();

  try {
    await test.step('회원가입 화면에서 새 회원 정보를 채우고 「가입하기」를 누른다', async () => {
      await 안내창끄기(page);
      await 화면.열기();
      await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
      await 화면.필수칸채우기(회원);
      await 화면.중복확인하기();
      await 화면.필수약관켜기();
      await 화면.가입하기누르기();
      await 완료.열림기다리기();
      await verify(
        '새 회원 정보로 가입하면 가입 완료 화면에 「{이름}님, 가입을 환영합니다」가 보인다',
        await 완료.환영문구.innerText(),
        `${회원.name}님, 가입을 환영합니다`,
      );
      await verify('가입 완료 화면에 「로그인하러 가기」 버튼이 보인다', await 완료.로그인하러가기버튼.isVisible(), true);
    });
  } finally {
    await 임시회원지우기(page.request, 회원);
  }
});

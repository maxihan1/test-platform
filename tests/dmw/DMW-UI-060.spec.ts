import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-060',
  name: '성별에 「선택 안 함」 · 「남성」 · 「여성」 라디오가 보이고 「선택 안 함」이 골라져 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  await 안내창막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('비회원이다', await 가입.머리.로그인.isVisible(), true, { blocker: true });
    await verify('회원가입 화면이 보인다', await 가입.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('회원가입 성별 칸을 확인한다', async () => {
    const 선택안함 = await verify('성별에 「선택 안 함」 라디오가 보인다', await 가입.성별('선택 안 함').isVisible(), true);
    const 남성 = await verify('성별에 「남성」 라디오가 보인다', await 가입.성별('남성').isVisible(), true);
    const 여성 = await verify('성별에 「여성」 라디오가 보인다', await 가입.성별('여성').isVisible(), true);
    const 골라짐 = await verify('「선택 안 함」이 골라져 있다', await 가입.성별('선택 안 함').isChecked(), true);
    await verify('성별에 「선택 안 함」 · 「남성」 · 「여성」 라디오가 보이고 「선택 안 함」이 골라져 있다', 선택안함 && 남성 && 여성 && 골라짐, true);
  });
});

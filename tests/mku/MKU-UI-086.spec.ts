import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디, 보이는이름들 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-086',
  name: '회원가입 화면에 성별 라디오 「선택 안 함」 · 「남성」 · 「여성」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('회원가입 화면을 연다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
    await 회원가입.제목.waitFor();
    await verify(
      '회원가입 화면에 성별 라디오 「선택 안 함」 · 「남성」 · 「여성」이 보인다',
      await 보이는이름들({ '「선택 안 함」': 회원가입.성별안함, '「남성」': 회원가입.성별남성, '「여성」': 회원가입.성별여성 }),
      '「선택 안 함」, 「남성」, 「여성」',
    );
    await verify(
      '회원가입 성별은 처음에 「선택 안 함」이 골라져 보인다',
      { 선택안함: await 회원가입.성별안함.isChecked(), 남성: await 회원가입.성별남성.isChecked(), 여성: await 회원가입.성별여성.isChecked() },
      { 선택안함: true, 남성: false, 여성: false },
    );
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새가입값 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 가입완료화면 } from './pages/signup-done.page.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-086',
  name: '회원가입에 성공하면 가입 완료 화면에 「<이름>님, 가입을 환영합니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    memberName: z.string().describe('가입할 이름 — 2~10자').default('홍길동'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 회원가입화면(page);
  const 완료 = new 가입완료화면(page);
  const 값 = 새가입값(params.memberName);
  await 안내창막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('비회원이다', await 가입.머리.로그인.isVisible(), true, { blocker: true });
    await verify('회원가입 화면이 보인다', await 가입.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('새 아이디로 회원가입을 마친다', async () => {
    await 가입.필수칸채우기(값);
    await 가입.중복확인하기();
    await 가입.필수약관동의();
    await verify('「가입하기」 버튼이 눌린다', await 가입.가입하기.isEnabled(), true, { blocker: true });
    await 가입.가입요청보내기();
    await 완료.그려질때까지();
    await verify('회원가입에 성공하면 가입 완료 화면에 「<이름>님, 가입을 환영합니다」가 보인다', await 완료.큰제목.innerText(), `${값.name}님, 가입을 환영합니다`);
  });

  await test.step('가입 완료 화면을 확인한다', async () => {
    await verify('회원가입에 성공하면 가입 완료 화면에 「로그인하러 가기」 버튼이 보인다', await 완료.로그인하러가기.isVisible(), true);
  });
});

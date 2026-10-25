import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새가입값 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-059',
  name: '모든 칸을 맞게 채우고 중복 확인을 마치면 「가입하기」 버튼이 눌린다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    memberName: z.string().describe('가입할 이름 — 2~10자').default('홍길동'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 회원가입화면(page);
  const 값 = 새가입값(params.memberName);
  await 안내창막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('비회원이다', await 가입.머리.로그인.isVisible(), true, { blocker: true });
    await verify('회원가입 화면이 보인다', await 가입.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('모든 칸을 맞게 채우고 중복 확인을 마친다', async () => {
    await 가입.필수칸채우기(값);
    await 가입.필수약관동의();
    await 가입.중복확인하기();
    await verify('사용 가능한 아이디라는 안내가 보인다', await 가입.사용가능.isVisible(), true, { blocker: true });
    await verify('모든 칸을 맞게 채우고 중복 확인을 마치면 「가입하기」 버튼이 눌린다', await 가입.가입하기.isEnabled(), true);
  });
});

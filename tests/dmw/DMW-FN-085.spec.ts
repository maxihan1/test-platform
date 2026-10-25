import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새가입값 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-085',
  name: '필수 약관 하나를 빼면 「가입하기」 버튼이 눌리지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['결정 테이블'],
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

  await test.step('필수 칸을 다 채우고 「(필수) 개인정보 수집 동의」만 끈다', async () => {
    await 가입.필수칸채우기(값);
    await 가입.중복확인하기();
    await 가입.필수약관동의();
    await verify('필수 칸과 필수 약관을 모두 채운 상태에서는 「가입하기」 버튼이 눌린다', await 가입.가입하기.isEnabled(), true, { blocker: true });
    await 가입.개인정보동의.uncheck();
    await verify('필수 약관 하나를 빼면 「가입하기」 버튼이 눌리지 않는다', await 가입.가입하기.isEnabled(), false);
  });

  await test.step('필수 약관에 동의하고 이름만 비운다', async () => {
    await 가입.개인정보동의.check();
    await verify('필수 약관 둘에 동의한 상태에서는 「가입하기」 버튼이 눌린다', await 가입.가입하기.isEnabled(), true, { blocker: true });
    await 가입.이름.fill('');
    await verify('필수 칸 하나를 비우면 「가입하기」 버튼이 눌리지 않는다', await 가입.가입하기.isEnabled(), false);
  });
});

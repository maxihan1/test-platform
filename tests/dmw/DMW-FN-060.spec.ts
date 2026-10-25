import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새아이디 } from './helpers/account.helper.js';
import { 새가입값 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-060',
  name: '중복 확인을 하지 않으면 「가입하기」 버튼이 눌리지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할', '결정 테이블'],
  params: z.object({
    memberName: z.string().describe('가입할 이름 — 2~10자').default('홍길동'),
    takenId: z.string().describe('이미 가입된 아이디 — 영문 소문자·숫자 4~12자').default('admin'),
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

  await test.step('중복 확인 없이 모든 칸을 맞게 채운다', async () => {
    await 가입.필수칸채우기(값);
    await 가입.필수약관동의();
    await verify('중복 확인을 하지 않으면 「가입하기」 버튼이 눌리지 않는다', await 가입.가입하기.isEnabled(), false);
  });

  await test.step('중복 확인 뒤 아이디를 고친다', async () => {
    await 가입.중복확인하기();
    await verify('중복 확인을 마친 뒤에는 「가입하기」 버튼이 눌린다', await 가입.가입하기.isEnabled(), true, { blocker: true });
    await 가입.아이디.fill(새아이디());
    await verify('중복 확인 뒤 아이디를 고치면 「가입하기」 버튼이 눌리지 않는다', await 가입.가입하기.isEnabled(), false);
  });

  await test.step('이미 있는 아이디로 중복 확인을 하고 나머지를 맞게 채운다', async () => {
    await 가입.필수칸채우기({ ...값, loginId: params.takenId });
    await 가입.필수약관동의();
    await 가입.중복확인하기();
    await verify('이미 사용 중인 아이디로 확인하면 「가입하기」 버튼이 눌리지 않는다', await 가입.가입하기.isEnabled(), false);
  });
});

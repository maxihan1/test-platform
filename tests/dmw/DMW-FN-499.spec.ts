import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-499',
  name: '휴대폰을 숫자 9자로 적으면 「휴대폰 번호는 숫자 10~11자입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    phoneShort: z.string().describe('가입할 휴대폰 — 숫자 9자').default('010123456'),
    phoneMin: z.string().describe('가입할 휴대폰 — 숫자 10자').default('0101234567'),
    phoneMax: z.string().describe('가입할 휴대폰 — 숫자 11자').default('01012345678'),
    phoneFit: z.string().describe('휴대폰 칸에 적을 값 — 숫자 11자').default('01012345678'),
    phoneOver: z.string().describe('휴대폰 칸에 적을 값 — 숫자 12자').default('010123456789'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 회원가입화면(page);
  await 안내창막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('비회원이다', await 가입.머리.로그인.isVisible(), true, { blocker: true });
    await verify('회원가입 화면이 보인다', await 가입.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('회원가입 휴대폰에 숫자 9자를 적는다', async () => {
    await 가입.휴대폰.fill(params.phoneShort);
    await verify('휴대폰을 숫자 9자로 적으면 「휴대폰 번호는 숫자 10~11자입니다」가 보인다', await 가입.휴대폰오류.isVisible(), true);
  });

  await test.step('회원가입 휴대폰에 숫자 10자를 적는다', async () => {
    await 가입.휴대폰.fill(params.phoneMin);
    await verify('휴대폰을 숫자 10자로 적으면 휴대폰 오류 문구가 보이지 않는다', await 가입.휴대폰오류.isVisible(), false);
  });

  await test.step('회원가입 휴대폰에 숫자 11자를 적는다', async () => {
    await 가입.휴대폰.fill(params.phoneMax);
    await verify('휴대폰을 숫자 11자로 적으면 휴대폰 오류 문구가 보이지 않는다', await 가입.휴대폰오류.isVisible(), false);
  });

  await test.step('회원가입 휴대폰 칸에 숫자 11자를 적는다', async () => {
    await 가입.휴대폰.fill(params.phoneFit);
    await verify('휴대폰 칸에 숫자 11자를 적으면 11자가 다 들어간다', await 가입.값길이(가입.휴대폰), 11);
  });

  await test.step('회원가입 휴대폰 칸에 숫자 12자를 적는다', async () => {
    await 가입.휴대폰.fill(params.phoneOver);
    await verify('휴대폰 칸에 숫자 12자를 적으면 11자까지만 들어간다', await 가입.값길이(가입.휴대폰), 11);
  });
});

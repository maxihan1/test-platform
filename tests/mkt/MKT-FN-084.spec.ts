import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-084',
  name: '휴대폰 10자를 적으면 휴대폰 오류 문구가 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    휴대폰10자: z.string().describe('휴대폰 10자 — 숫자 10자').default('0101234567'),
    휴대폰11자: z.string().describe('휴대폰 11자 — 숫자 11자').default('01012345678'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 방해창막기(page);
    await 가입.열기();
    await verify('회원가입 화면 제목 「회원가입」이 보인다', await 가입.제목.isVisible(), true, { blocker: true });
  });

  await test.step('휴대폰 칸에 10자 「0101234567」을 적는다', async () => {
    await 가입.입력하기('phone', params.휴대폰10자);
    await 두프레임뒤(page);
    await verify('휴대폰 10자를 적으면 휴대폰 오류 문구가 보이지 않는다', await 가입.오류문구('phone').isVisible(), false);
  });

  await test.step('휴대폰 칸에 11자 「01012345678」을 적는다', async () => {
    await 가입.입력하기('phone', params.휴대폰11자);
    await 두프레임뒤(page);
    await verify('휴대폰 11자를 적으면 휴대폰 오류 문구가 보이지 않는다', await 가입.오류문구('phone').isVisible(), false);
  });
});

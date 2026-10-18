import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-066',
  name: '대문자가 든 아이디를 적으면 「아이디는 영문 소문자·숫자 4~12자입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    대문자가든아이디: z.string().describe('대문자가 든 아이디 — 영문자와 숫자 4~12자 가운데 대문자가 하나 이상').default('Demo1234'),
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

  await test.step('아이디 칸에 대문자가 든 「Demo1234」를 적는다', async () => {
    await 가입.입력하기('loginId', params.대문자가든아이디);
    await 두프레임뒤(page);
    await verify('대문자가 든 아이디를 적으면 「아이디는 영문 소문자·숫자 4~12자입니다」가 보인다', await 가입.오류문구('loginId').isVisible(), true);
  });

  await test.step('아이디 오류 문구의 글자색을 확인한다', async () => {
    await verify('아이디 오류 문구가 빨간 글자로 보인다', await 가입.오류문구빨강인가('loginId'), true);
  });
});

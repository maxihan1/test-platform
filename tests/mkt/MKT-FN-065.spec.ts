import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-065',
  name: '아이디 3자를 적으면 「아이디는 영문 소문자·숫자 4~12자입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    아이디3자: z.string().describe('아이디 3자 — 영문 소문자와 숫자 3자 이하').default('abc'),
    아이디4자: z.string().describe('아이디 4자 — 영문 소문자와 숫자 4자').default('abcd'),
    아이디12자: z.string().describe('아이디 12자 — 영문 소문자와 숫자 12자').default('abcdefgh1234'),
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

  await test.step('아이디 칸에 3자 「abc」를 적는다', async () => {
    await 가입.입력하기('loginId', params.아이디3자);
    await 두프레임뒤(page);
    await verify('아이디 3자를 적으면 「아이디는 영문 소문자·숫자 4~12자입니다」가 보인다', await 가입.오류문구('loginId').isVisible(), true);
  });

  await test.step('아이디 칸에 4자 「abcd」를 적는다', async () => {
    await 가입.입력하기('loginId', params.아이디4자);
    await 두프레임뒤(page);
    await verify('아이디 4자를 적으면 아이디 오류 문구가 보이지 않는다', await 가입.오류문구('loginId').isVisible(), false);
  });

  await test.step('아이디 칸에 12자 「abcdefgh1234」를 적는다', async () => {
    await 가입.입력하기('loginId', params.아이디12자);
    await 두프레임뒤(page);
    await verify('아이디 12자를 적으면 아이디 오류 문구가 보이지 않는다', await 가입.오류문구('loginId').isVisible(), false);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-079',
  name: '이름 2자를 적으면 이름 오류 문구가 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    이름2자: z.string().describe('이름 2자 — 한글 2자').default('홍길'),
    이름10자: z.string().describe('이름 10자 — 한글 10자').default('가나다라마바사아자차'),
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

  await test.step('이름 칸에 2자 「홍길」을 적는다', async () => {
    await 가입.입력하기('name', params.이름2자);
    await 두프레임뒤(page);
    await verify('이름 2자를 적으면 이름 오류 문구가 보이지 않는다', await 가입.오류문구('name').isVisible(), false);
  });

  await test.step('이름 칸에 10자를 적는다', async () => {
    await 가입.입력하기('name', params.이름10자);
    await 두프레임뒤(page);
    await verify('이름 10자를 적으면 이름 오류 문구가 보이지 않는다', await 가입.오류문구('name').isVisible(), false);
  });
});

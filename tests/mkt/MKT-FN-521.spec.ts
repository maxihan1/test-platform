import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-521',
  name: '휴대폰 9자를 적으면 「휴대폰 번호는 숫자 10~11자입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    휴대폰9자: z.string().describe('휴대폰 9자 — 숫자 9자').default('010123456'),
    휴대폰12자: z.string().describe('휴대폰 12자 — 숫자 12자').default('010123456789'),
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

  await test.step('휴대폰 칸에 9자 「010123456」을 적는다', async () => {
    await 가입.입력하기('phone', params.휴대폰9자);
    await 두프레임뒤(page);
    await verify('휴대폰 9자를 적으면 「휴대폰 번호는 숫자 10~11자입니다」가 보인다', await 가입.오류문구('phone').isVisible(), true);
  });

  await test.step('휴대폰 칸에 12자 「010123456789」를 적는다', async () => {
    await 가입.입력하기('phone', params.휴대폰12자);
    await verify('휴대폰 칸에 12자를 적으면 11자까지만 들어간다', `${(await 가입.칸값('phone')).length}자 ${await 가입.칸값('phone')}`, `11자 ${params.휴대폰12자.slice(0, 11)}`);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 암호만들기 } from './helpers/text-data.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기, 새계정값, 연지3초지날때까지 } from './helpers/signup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-224',
  name: '가입 암호를 7자로 넣고 「등록하기」를 누르면 가입되지 않고 가입 화면에 남는다',
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    짧은암호길이: z.number().int().min(1).max(7).describe('가입 암호 글자 수 — 1~7자').default(7),
    최소암호길이: z.number().int().min(8).max(72).describe('가입 암호 글자 수 — 8~72자').default(8),
    최대암호길이: z.number().int().min(8).max(72).describe('가입 암호 글자 수 — 8~72자').default(72),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 가입화면(page);

  await test.step('가입 화면 「암호」에 7자를 넣고 나머지를 채워 「등록하기」를 누른다', async () => {
    await 한국어로(page);
    const 연시각 = await 가입화면열기(page);
    await verify('가입 화면이 열려 있다', await 가입.등록하기.isVisible(), true, { blocker: true });
    const 값 = 새계정값();
    await 가입.채우기({ 사용자명: 값.사용자명, 이메일: 값.이메일, 암호: 암호만들기(params.짧은암호길이) });
    await 가입.동의하기();
    await 연지3초지날때까지(page, 연시각);
    const 나간요청수 = await 가입.누르고나간요청수();
    const 남음 = await verify('가입 화면이 그대로 보인다', await 가입.제목.isVisible(), true);
    const 안나감 = await verify('가입 요청이 나가지 않는다', 나간요청수, 0);
    await verify('가입 암호를 7자로 넣고 「등록하기」를 누르면 가입되지 않고 가입 화면에 남는다', 남음 && 안나감, true);
  });

  await test.step('가입 화면 「암호」에 8자를 넣고 동의는 비운 채 「등록하기」를 누른다', async () => {
    const 연시각 = await 가입화면열기(page);
    const 값 = 새계정값();
    await 가입.채우기({ 사용자명: 값.사용자명, 이메일: 값.이메일, 암호: 암호만들기(params.최소암호길이) });
    await 연지3초지날때까지(page, 연시각);
    await 가입.누르기();
    await 가입.상단오류.waitFor();
    await verify('8자 암호에는 암호 칸 오류가 없다', await 가입.칸오류(가입.암호칸).isVisible(), false);
  });

  await test.step('가입 화면 「암호」에 72자를 넣고 동의는 비운 채 「등록하기」를 누른다', async () => {
    const 연시각 = await 가입화면열기(page);
    const 값 = 새계정값();
    await 가입.채우기({ 사용자명: 값.사용자명, 이메일: 값.이메일, 암호: 암호만들기(params.최대암호길이) });
    await 연지3초지날때까지(page, 연시각);
    await 가입.누르기();
    await 가입.상단오류.waitFor();
    await verify('72자 암호에도 암호 칸 오류가 없다', await 가입.칸오류(가입.암호칸).isVisible(), false);
  });
});

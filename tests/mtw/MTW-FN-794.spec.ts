import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 긴이메일만들기 } from './helpers/text-data.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기, 새계정값, 연지3초지날때까지 } from './helpers/signup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-794',
  name: '이메일을 320자로 넣으면 이메일 칸에 길이 오류가 없다',
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    최대이메일길이: z.number().int().min(257).max(320).describe('가입 이메일 글자 수 — 257~320자').default(320),
    넘는이메일길이: z.number().int().min(321).max(400).describe('가입 이메일 글자 수 — 321~400자').default(321),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 가입화면(page);

  await test.step('가입 「이메일 주소」에 320자를 넣고 「등록하기」를 누른다', async () => {
    await 한국어로(page);
    const 연시각 = await 가입화면열기(page);
    await verify('가입 화면이 열려 있다', await 가입.등록하기.isVisible(), true, { blocker: true });
    const 값 = 새계정값();
    await 가입.채우기({ 사용자명: 값.사용자명, 이메일: 긴이메일만들기(params.최대이메일길이), 암호: 값.암호 });
    await 연지3초지날때까지(page, 연시각);
    await 가입.누르기();
    await 가입.제출결과기다리기();
    const 길이오류 = 가입.칸오류(가입.이메일칸).filter({ hasText: '320자를 넘을 수 없습니다' });
    await verify('이메일을 320자로 넣으면 이메일 칸에 길이 오류가 없다', await 길이오류.isVisible(), false);
  });

  await test.step('가입 「이메일 주소」에 321자를 넣고 「등록하기」를 누른다', async () => {
    const 연시각 = await 가입화면열기(page);
    const 값 = 새계정값();
    await 가입.채우기({ 사용자명: 값.사용자명, 이메일: 긴이메일만들기(params.넘는이메일길이), 암호: 값.암호 });
    await 연지3초지날때까지(page, 연시각);
    await 가입.누르기();
    await 가입.제출결과기다리기();
    const 길이오류 = 가입.칸오류(가입.이메일칸).filter({ hasText: '320자를 넘을 수 없습니다' });
    await verify('321자 이메일에는 이메일 칸에 길이 오류가 보인다', await 길이오류.isVisible(), true);
  });
});

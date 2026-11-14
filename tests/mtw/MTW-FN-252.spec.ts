import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기, 새계정값, 연지3초지날때까지 } from './helpers/signup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-252',
  name: '메일 서버가 없는 도메인의 이메일로 「등록하기」를 누르면 「존재하지 않는 것 같습니다」가 보인다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: z.object({
    메일서버없는도메인: z.string().min(1).describe('메일 서버가 없는 도메인 — MX 레코드가 없는 이름').default('tc-no-mail-server.invalid'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 가입화면(page);
  let 연시각 = 0;

  await test.step('가입 화면을 연다', async () => {
    await 한국어로(page);
    연시각 = await 가입화면열기(page);
    await verify('가입 화면이 열려 있다', await 가입.등록하기.isVisible(), true, { blocker: true });
  });

  await test.step('가입 화면에 메일 서버가 없는 도메인의 이메일을 넣고 「등록하기」를 누른다', async () => {
    const 값 = 새계정값();
    await 가입.채우기({ 사용자명: 값.사용자명, 이메일: `${값.사용자명}@${params.메일서버없는도메인}`, 암호: 값.암호 });
    await 가입.동의하기();
    await 연지3초지날때까지(page, 연시각);
    await 가입.누르기();
    const 오류 = 가입.칸오류(가입.이메일칸).filter({ hasText: '존재하지 않는 것 같습니다' });
    const 떴다 = await 오류.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('메일 서버가 없는 도메인의 이메일로 「등록하기」를 누르면 「존재하지 않는 것 같습니다」가 보인다', 떴다, true);
  });
});

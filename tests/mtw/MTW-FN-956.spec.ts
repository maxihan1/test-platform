import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기, 새계정값, 연지3초지날때까지 } from './helpers/signup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-956',
  name: '이미 쓰는 사용자명으로 「등록하기」를 누르면 사용자명 칸에 「이미 사용중인 사용자명입니다. 다시 시도해보세요」가 보인다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    쓰는사용자명: z.string().min(1).describe('이미 쓰는 사용자명 — 시드 계정 qa_user1').default('qa_user1'),
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

  await test.step('가입 화면 「사용자명」에 qa_user1 을 넣고 「등록하기」를 누른다', async () => {
    const 값 = 새계정값();
    await 가입.채우기({ 사용자명: params.쓰는사용자명, 이메일: 값.이메일, 암호: 값.암호 });
    await 가입.동의하기();
    await 연지3초지날때까지(page, 연시각);
    await 가입.누르기();
    await verify(
      '이미 쓰는 사용자명으로 「등록하기」를 누르면 사용자명 칸에 「이미 사용중인 사용자명입니다. 다시 시도해보세요」가 보인다',
      await 가입.칸오류글(가입.사용자명칸),
      '이미 사용중인 사용자명입니다. 다시 시도해보세요',
    );
  });

  await test.step('가입 화면 「이메일 주소」에 일반 회원 이메일을 넣고 「등록하기」를 누른다', async () => {
    연시각 = await 가입화면열기(page);
    const 값 = 새계정값();
    await 가입.채우기({ 사용자명: 값.사용자명, 이메일: params.loginId ?? '', 암호: 값.암호 });
    await 가입.동의하기();
    await 연지3초지날때까지(page, 연시각);
    await 가입.누르기();
    const 상단떴다 = await 가입.상단오류.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 칸 = await verify('이메일 칸 아래 오류는 「이미 존재하는 값입니다」다', await 가입.칸오류글(가입.이메일칸), '이미 존재하는 값입니다');
    const 상단 = await verify('상단 오류 목록이 보인다', 상단떴다, true);
    await verify('이미 쓰는 이메일에는 칸 아래 「이미 존재하는 값입니다」와 상단 오류 목록이 보인다', 칸 && 상단, true);
  });

  await test.step('가입 화면 「암호 다시 입력」을 다르게 넣고 「등록하기」를 누른다', async () => {
    연시각 = await 가입화면열기(page);
    const 값 = 새계정값();
    await 가입.채우기({ 사용자명: 값.사용자명, 이메일: 값.이메일, 암호: 값.암호, 암호확인: `${값.암호}x` });
    await 가입.동의하기();
    await 연지3초지날때까지(page, 연시각);
    await 가입.누르기();
    await verify('암호 불일치에는 「암호 확인 값이 일치하지 않습니다」가 보인다', await 가입.칸오류글(가입.암호확인칸), '암호 확인 값이 일치하지 않습니다');
  });

  await test.step('가입 화면 동의를 비운 채 「등록하기」를 누른다', async () => {
    연시각 = await 가입화면열기(page);
    const 값 = 새계정값();
    await 가입.채우기(값);
    await 연지3초지날때까지(page, 연시각);
    await 가입.누르기();
    await 가입.상단오류.waitFor({ timeout: 10_000 }).catch(() => undefined);
    await verify('동의를 비운 제출에는 동의 칸 아래 「이 항목을 반드시 확인해 주세요」가 보인다', await 가입.칸오류글(가입.동의칸), '이 항목을 반드시 확인해 주세요');
  });
});

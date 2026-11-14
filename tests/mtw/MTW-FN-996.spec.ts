import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 암호만들기 } from './helpers/text-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 암호와보안화면 } from './pages/auth-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-996',
  name: '암호 및 보안 「새로운 암호 입력」 칸에 73자를 넣으면 72자까지만 들어간다',
  precondition: ['두 번째 사용자로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    새암호글자수: z.number().int().min(73).max(120).describe('새 암호 칸에 넣을 글자 수 — 73~120자').default(73),
  }),
  expected: z.object({
    남는글자수: z.number().int().describe('칸에 남는 글자 수').default(72),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 설정 = new 암호와보안화면(page);

  await test.step('두 번째 사용자로 로그인해 암호 및 보안을 연다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    await 설정.열기();
    await verify('암호 및 보안 화면에 「변경 사항을 저장」이 보인다', await 설정.틀.저장.isVisible(), true, { blocker: true });
  });

  await test.step('암호 및 보안 「새로운 암호 입력」 칸에 73자를 넣는다', async () => {
    await 설정.새암호치기(암호만들기(params.새암호글자수));
    await verify('암호 및 보안 「새로운 암호 입력」 칸에 73자를 넣으면 72자까지만 들어간다', await 설정.글자수(설정.새암호칸), expected.남는글자수);
  });
});

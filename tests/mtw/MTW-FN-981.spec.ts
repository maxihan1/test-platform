import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 컬렉션만들기화면 } from './pages/collection-new.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-981',
  name: '컬렉션에 계정을 25개 넣으면 더 넣을 수 없다',
  techniques: ['경계값 분석'],
  held: '보류 — 추가할 수 있는 계정이 25개가 안 된다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),

    추가할계정들: z.string().describe('컬렉션에 넣을 계정 아이디 26개 — 쉼표로 잇고 발견하기에 참여한 계정'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 컬렉션만들기화면(page);
  const 아이디들 = params.추가할계정들.split(',').map((아이디) => 아이디.trim());

  await test.step('일반 회원으로 로그인하고 새 컬렉션 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('새 컬렉션 화면에 「새 컬렉션」 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
  });

  await test.step('새 컬렉션에 계정을 25개까지 넣고 하나 더 넣는다', async () => {
    for (const 아이디 of 아이디들.slice(0, 25)) await 화면.계정더하기(아이디);
    await verify('계정이 25개 들어갔다', await 화면.계정수.innerText(), '계정 25/25개', { blocker: true });
    await 화면.계정검색(아이디들[25] ?? '');
    const 선택됨 = await 화면.결과(아이디들[25] ?? '').click({ timeout: 5_000 }).then(() => true, () => false);
    await verify('컬렉션에 계정을 25개 넣으면 더 넣을 수 없다', 선택됨 && (await 화면.계정수.innerText()) !== '계정 25/25개', false);
  });
});

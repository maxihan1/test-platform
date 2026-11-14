import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 제재없는계정찾기, 시험계정 } from './helpers/sanction.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-058',
  name: '제재가 없는 계정 줄에 상태 칩 「정상」과 「정지」 · 「채팅 금지」 · 「상세」 버튼이 보인다',
  precondition: ['제재가 없는 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  let 아이디: string | null = null;

  await test.step('운영자 계정으로 로그인하고 제재가 없는 계정을 찾는다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    아이디 = await 제재없는계정찾기(page, [시험계정, 'qa_player1']);
  });

  await test.step('「유저 · 제재」에서 제재가 없는 계정 줄을 확인한다', async () => {
    await verify('제재가 걸리지 않은 계정이 있다', 아이디 !== null, true, { blocker: true });
    await 화면.열기(`?q=${encodeURIComponent(아이디 ?? '')}`);
    await verify('찾은 계정 줄이 보인다', await 화면.유저줄(아이디 ?? '').isVisible(), true, { blocker: true });
  });

  await test.step('제재가 없는 계정 줄을 본다', async () => {
    const 칩 = await verify('상태 칩이 「정상」이다', (await 화면.상태칩들(아이디 ?? '').allInnerTexts()).join(', '), '정상');
    const 정지 = await verify('「정지」 버튼이 보인다', await 화면.줄버튼(아이디 ?? '', '정지').isVisible(), true);
    const 채팅금지 = await verify('「채팅 금지」 버튼이 보인다', await 화면.줄버튼(아이디 ?? '', '채팅 금지').isVisible(), true);
    const 상세 = await verify('「상세」 버튼이 보인다', await 화면.줄버튼(아이디 ?? '', '상세').isVisible(), true);
    await verify('제재가 없는 계정 줄에 상태 칩 「정상」과 「정지」 · 「채팅 금지」 · 「상세」 버튼이 보인다', 칩 && 정지 && 채팅금지 && 상세, true);
  });
});

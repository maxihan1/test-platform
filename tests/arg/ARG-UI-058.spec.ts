import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 던전 } from './pages/dungeon.page.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-058',
  name: '조작 안내 창에 「화면을 눌러 이동 · 대상」 · 「적을 눌러 기본 공격」 · 「아래 버튼으로 스킬 사용」이 보인다',
  platforms: ['android'],
  precondition: ['던전에 막 들어가 조작 안내 창이 떠 있다'],
  elements: ['class:tank', 'zone:Dungeon'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    설명들: z.string().describe('조작 안내 창 설명 세 줄').default('화면을 눌러 이동 · 대상 / 적을 눌러 기본 공격 / 아래 버튼으로 스킬 사용'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 던전에 막 들어간다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    const 대기실 = await 로비.열기(game);
    await 대기실.직업고르기('탱커');
    await 대기실.준비누르기();
    const 화면 = await 던전.열기(game);
    await verify('조작 안내 창이 보인다', await 화면.안내창이뜨는지(), true, { blocker: true });
  });

  await test.step('조작 안내 창 설명 글을 확인한다', async () => {
    const 화면 = await 던전.열기(game);
    await verify(
      '조작 안내 창에 「화면을 눌러 이동 · 대상」 · 「적을 눌러 기본 공격」 · 「아래 버튼으로 스킬 사용」이 보인다',
      await 화면.안내설명글들(),
      expected.설명들,
    );
  });
});

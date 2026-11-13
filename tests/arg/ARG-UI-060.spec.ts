import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 있는지 } from './helpers/find.helper.js';
import { 던전까지 } from './helpers/login.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-060',
  name: '궁수 던전 행동 막대에 「공격」 · 「스킬 1」 · 「스킬 2」 · 「감정」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 궁수로 던전에 들어가 있다'],
  elements: ['class:archer', 'zone:Dungeon'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    버튼들: z.string().describe('궁수 행동 막대 버튼 글자').default('공격 · 스킬 1 · 스킬 2 · 감정'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 궁수 던전에 들어간다', async () => {
    const 화면 = await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '', '궁수');
    await 화면.안내창닫기();
    await verify('던전 행동 막대가 보인다', await 있는지(game, 던전.행동막대), true, { blocker: true });
  });

  await test.step('던전 행동 막대를 확인한다', async () => {
    const 화면 = await 던전.열기(game);
    await verify('궁수 던전 행동 막대에 「공격」 · 「스킬 1」 · 「스킬 2」 · 「감정」 버튼이 보인다', await 화면.행동버튼글들(), expected.버튼들);
  });
});

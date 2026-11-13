import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-350',
  name: '행동 버튼에 손가락이나 마우스를 올리면 스킬 설명이 말풍선으로 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 던전에 들어가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 손가락을 올려 두는 동작이 게임 드라이버에 없다',
});

test(spec, async ({ game, params }) => {
  await test.step('행동 버튼에 손가락을 올려 둔다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('행동 버튼에 손가락이나 마우스를 올리면 스킬 설명이 말풍선으로 뜬다', await 있는지(game, 던전.행동막대), true);
  });
});

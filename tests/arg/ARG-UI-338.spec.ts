import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 자리이름 } from './helpers/lobby-place.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전까지 } from './helpers/login.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-338',
  name: '던전 왼쪽 위 초상화에 내 이름과 체력 막대가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 탱커로 던전에 들어가 있다'],
  elements: ['class:tank', 'zone:Dungeon'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    모양: z.string().describe('초상화 자리와 내용').default('왼쪽 위 · 내 이름 · 체력 막대'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 탱커 던전에 들어간다', async () => {
    const 화면 = await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await 화면.안내창닫기();
    await verify('던전 행동 막대가 보인다', await 있는지(game, 던전.행동막대), true, { blocker: true });
  });

  await test.step('던전 왼쪽 위 초상화를 확인한다', async () => {
    const 화면 = await 던전.열기(game);
    await 화면.초상화가채워질때까지(params.loginId ?? '');
    const 이름글 = await 화면.초상화이름();
    const 내이름 = await 화면.hud.캐릭터이름();
    const 모양 = [
      await 자리이름(game, 던전.초상화),
      이름글 === 내이름 ? '내 이름' : 이름글,
      (await 화면.체력막대가있는지()) ? '체력 막대' : '체력 막대 없음',
    ].join(' · ');
    await verify('던전 왼쪽 위 초상화에 내 이름과 체력 막대가 보인다', 모양, expected.모양);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한줄로 } from './helpers/dungeon-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-085',
  name: '휴대폰에서 던전에 들어가면 조작 안내 창 설명 글이 「화면을 눌러 이동 · 대상」 · 「적을 눌러 기본 공격」 · 「아래 버튼으로 스킬 사용」이다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('첫 자리를 고르고 「준비!」를 누른다', async () => {
    const 로비 = await 로비화면.열기(game);
    await 로비.자리누르기(0);
    await 로비.준비누르기();
    const 던전 = new 던전화면(game);
    await verify('조작 안내 창이 뜬다', await 던전.조작안내뜰때까지(), true, { blocker: true });
    const 이동 = await verify('이동 설명이 「화면을 눌러 이동 · 대상」이다', 한줄로(await 던전.조작안내글('Instr Text 1 (TMP)')), '화면을 눌러 이동 · 대상');
    const 공격 = await verify('공격 설명이 「적을 눌러 기본 공격」이다', 한줄로(await 던전.조작안내글('Instr Text 2 (TMP)')), '적을 눌러 기본 공격');
    const 스킬 = await verify('스킬 설명이 「아래 버튼으로 스킬 사용」이다', 한줄로(await 던전.조작안내글('Instr Text 3 (TMP)')), '아래 버튼으로 스킬 사용');
    await verify('휴대폰에서 던전에 들어가면 조작 안내 창 설명 글이 「화면을 눌러 이동 · 대상」 · 「적을 눌러 기본 공격」 · 「아래 버튼으로 스킬 사용」이다', 이동 && 공격 && 스킬, true);
  });
});

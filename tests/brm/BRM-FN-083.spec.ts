import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-083',
  name: '던전에 들어가면 조작 안내 창 제목에 「보스를 쓰러뜨리세요!」가 보인다',
  platforms: ['android'],
  smoke: true,
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['zone:DungeonStart'],
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
    await verify('던전에 들어가면 조작 안내 창 제목에 「보스를 쓰러뜨리세요!」가 보인다', await 던전.조작안내글('Title Text (TMP)'), '보스를 쓰러뜨리세요!');
    const 이동 = await verify('「이동 · 대상」 설명이 보인다', (await 던전.조작안내글('Instr Text 1 (TMP)')).includes('이동 · 대상'), true);
    const 공격 = await verify('「기본 공격」 설명이 보인다', (await 던전.조작안내글('Instr Text 2 (TMP)')).includes('기본 공격'), true);
    const 확대 = await verify('「확대」 설명이 보인다', (await 던전.조작안내글('Instr Text 4 (TMP)')).includes('확대'), true);
    const 스킬 = await verify('「스킬」 설명이 보인다', (await 던전.조작안내글('Instr Text 3 (TMP)')).includes('스킬'), true);
    const 그림 = await verify('설명 그림이 보인다', await 던전.조작안내그림보임(), true);
    const 확인 = await verify('「확인」 버튼이 보인다', await 던전.조작안내확인글(), '확인');
    await verify('조작 안내 창에 「이동 · 대상」 · 「기본 공격」 · 「확대」 · 「스킬」 그림과 「확인」 버튼이 보인다', 이동 && 공격 && 확대 && 스킬 && 그림 && 확인, true);
    const 배치 = await game.layout(던전화면.조작안내);
    await verify('조작 안내 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
  });
});

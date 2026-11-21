import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에서끼기, 사기, 임프하나만두기 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { type 로그줄, 미션로그, 설명안되는줄, 적치우고레벨맞추기, 준피해 } from './helpers/mission-log.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-GS-003',
  name: 'BRM-REQ-376 레벨 10 도적이 「룬 새김 도끼」를 끼고 「질주 공격」으로 준 피해는 44 다',
  platforms: ['android'],
  precondition: ['도적 · 레벨 10 · 「룬 새김 도끼」 · 혼자 던전'],
  held: '보류 — 「질주 공격」이 폰 누르기로 안 나감(행동 버튼 Button1 뒤 /Imp(Clone) 누르기 · 적 뒤 버튼 누르기 · 손가락 눌렀다 떼기 모두 피해 줄이 안 생김)',
  elements: ['monster:임프', 'skill:질주 공격', 'item:룬 새김 도끼', 'state:레벨=10', 'state:무기=룬 새김 도끼', 'state:직업=도적'],
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
  await test.step('로비에서 「룬 새김 도끼」를 사서 끼고 도적으로 혼자 던전에 들어가 레벨 10 으로 맞춘다', async () => {
    await 로비로(game, driver, 나);
    await 골드맞추기(game, 5000);
    await 사기(game, '룬 새김 도끼');
    await verify('「룬 새김 도끼」를 무기 칸에 낀다', await 가방에서끼기(game, '룬 새김 도끼', '무기'), true, { blocker: true });
    await 던전으로(game, driver, 나, 6);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
    await 적치우고레벨맞추기(game, 10);
  });
  const 로그 = await gameLog(미션로그(admin));
  await test.step('「질주 공격」으로 임프 2마리를 잡는다', async () => {
    const 던전 = await 던전화면.열기(game);
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(
        async () => {
          await 임프하나만두기(game);
          await 던전.질주공격으로임프치기();
        },
        {
          progress: async () => 준피해((줄들 = await 로그.lines()), 나.아이디, '질주 공격').length,
          goal: 2,
          stallMs: 60_000,
        },
      );
    } catch (e) {
      멈춤 = e;
    }
    const 피해 = await verify.log('「질주 공격」으로 준 피해 줄이 전부 44 다', 준피해(줄들, 나.아이디, '질주 공격').map((줄) => 줄.value), 44);
    await verify('BRM-REQ-376 레벨 10 도적이 「룬 새김 도끼」를 끼고 「질주 공격」으로 준 피해는 44 다', 피해, true);
    const 조건 = { 레벨: 10, 직업: '도적', 무기: '룬 새김 도끼', 갑옷: '-', 인원: 1 };
    for (const 줄 of 설명안되는줄(줄들, 나.아이디, 조건, ['hit', 'kill', 'item']).slice(0, 10)) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});

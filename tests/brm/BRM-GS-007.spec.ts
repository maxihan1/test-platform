import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 레벨맞추기, 보스방가기, 보스처치, 봇모두끄기, 전리품원래대로 } from './helpers/game-state.helper.js';
import { type 로그줄, 미션로그, 설명안되는줄, 처치마다전리품, 처치줄 } from './helpers/mission-log.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-GS-007',
  name: '레벨 1 탱커가 장비 없이 혼자 보스 임프를 잡으면 처치 경험치 · 골드 · 전리품이 기획서 값이다',
  platforms: ['android'],
  precondition: ['탱커 · 레벨 1 · 장비 없음 · 혼자 던전 · 전리품 원래 확률'],
  elements: ['monster:보스 임프', 'rate:보스 경험치', 'rate:보스 골드', 'drop:보스 임프', 'item:불꽃의 검', 'item:용비늘 갑옷', 'item:보스의 왕관 조각', 'state:레벨=1'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 보스전리품 = ['불꽃의 검', '용비늘 갑옷', '보스의 왕관 조각'];
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('탱커로 혼자 던전에 들어가 레벨 1 · 전리품 원래 확률로 맞추고 보스 방에 간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
    await 레벨맞추기(game, 1);
    await 전리품원래대로(game);
    await 보스방가기(game);
  });
  const 로그 = await gameLog(미션로그(admin));
  await test.step('보스 방에서 보스 임프를 잡는다', async () => {
    const 던전 = await 던전화면.열기(game);
    let 줄들: 로그줄[] = [];
    let 친번 = 0;
    let 멈춤: unknown;
    try {
      await repeatUntil(
        async () => {
          if (친번 === 0) await 보스처치(game);
          else await 던전.결과화면으로넘어갈때까지(10_000);
          친번 += 1;
        },
        {
          progress: async () => 처치줄((줄들 = await 로그.lines()), 나.아이디, 'ImpBoss').length,
          goal: 1,
          stallMs: 60_000,
        },
      );
    } catch (e) {
      멈춤 = e;
    }
    const 처치 = 처치줄(줄들, 나.아이디, 'ImpBoss');
    const 전리품 = 처치마다전리품(줄들, 나.아이디, 'ImpBoss');
    const 경험치 = await verify.log('보스 처치 줄 경험치가 전부 300 이다', 처치.map((줄) => 줄.exp), 300);
    const 골드 = await verify.log('보스 처치 줄 골드가 전부 200 이다', 처치.map((줄) => 줄.gold), 200);
    const 개수 = await verify.log('보스 처치마다 아이템 줄이 1줄이다', 전리품.map((x) => x.length), 1);
    const 목록안 = await verify.log('보스 처치 아이템 줄이 기획서 전리품 셋 가운데 하나다', 전리품.flat().map((x) => (보스전리품.includes(x) ? 1 : 0)), 1);
    await verify.note('보스 처치로 받은 아이템', 전리품);
    await verify('BRM-REQ-124 혼자 장비 없이 잡은 보스 처치 경험치는 300 이다', 경험치, true);
    await verify('BRM-REQ-131 장비 없이 잡은 보스 처치 골드는 200 이다', 골드, true);
    await verify('BRM-REQ-132 보스 처치로 받은 전리품 줄은 1줄이다', 개수, true);
    await verify('BRM-REQ-133 보스 처치 전리품은 「불꽃의 검」 · 「용비늘 갑옷」 · 「보스의 왕관 조각」 가운데 하나다', 목록안, true);
    const 조건 = { 레벨: 1, 직업: '탱커', 무기: '-', 갑옷: '-', 인원: 1 };
    for (const 줄 of 설명안되는줄(줄들, 나.아이디, 조건, ['hit', 'kill', 'item', 'levelup']).slice(0, 10)) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});

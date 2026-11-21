import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇켜기, 체력채우기 } from './helpers/game-state.helper.js';
import { type 로그줄, 미션로그, 반올림, 설명안되는줄, 임프있게하기, 적치우고레벨맞추기, 처치줄, 켜둔봇과던전으로 } from './helpers/mission-log.helper.js';
import { 파티에초대해맺기 } from './helpers/social-tools.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-GS-009',
  name: '레벨 1 탱커가 봇 셋과 4명 파티로 임프 2마리를 잡는 동안 처치 경험치와 파티원마다 받은 처치 보상이 기획서 값이다',
  platforms: ['android'],
  precondition: ['탱커 · 레벨 1 · 장비 없음 · 두 번째 · 세 번째 · 네 번째 플레이어 봇과 4명 파티로 던전'],
  elements: ['monster:임프', 'rate:임프 경험치', 'rate:파티 경험치 배율', 'state:파티=4명', 'state:레벨=1', 'state:직업=탱커'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p4Id: z.string().describe('네 번째 플레이어 아이디').optional().meta({ secret: true, account: '네 번째 플레이어' }),
    p4Password: z.string().describe('네 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '네 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 두번째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  const 세번째 = 계정꺼내기(params.p3Id, params.p3Password, '세 번째 플레이어');
  const 네번째 = 계정꺼내기(params.p4Id, params.p4Password, '네 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 · 두 번째 · 세 번째 · 네 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 두번째);
    await 계정되돌리기(admin, 세번째);
    await 계정되돌리기(admin, 네번째);
  });
  await test.step('로비에서 두 번째 · 세 번째 · 네 번째 플레이어 봇을 파티에 넣고 4명이 던전에 들어가 레벨 1 로 맞춘다', async () => {
    await 로비로(game, driver, 나);
    await 봇켜기(admin, 두번째);
    await 봇켜기(admin, 세번째);
    await 봇켜기(admin, 네번째);
    await verify('두 번째 플레이어 봇이 파티에 들어온다', await 파티에초대해맺기(game, admin, 나, 두번째, '파티 2/4'), true, { blocker: true });
    await verify('세 번째 플레이어 봇이 파티에 들어온다', await 파티에초대해맺기(game, admin, 나, 세번째, '파티 3/4'), true, { blocker: true });
    await verify('네 번째 플레이어 봇이 파티에 들어와 4명 파티가 된다', await 파티에초대해맺기(game, admin, 나, 네번째, '파티 4/4'), true, { blocker: true });
    await 켜둔봇과던전으로(game, admin, [{ 아이디: 두번째.아이디, 자리: 2 }, { 아이디: 세번째.아이디, 자리: 4 }, { 아이디: 네번째.아이디, 자리: 6 }], 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
    await 적치우고레벨맞추기(game, 1);
    await 체력채우기(game);
  });
  const 로그 = await gameLog(미션로그(admin));
  await test.step('임프를 불러내 2마리를 잡는다', async () => {
    const 던전 = await 던전화면.열기(game);
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(
        async () => {
          await 임프있게하기(game);
          await 던전.첫임프치기();
        },
        {
          progress: async () => 처치줄((줄들 = await 로그.lines()), 나.아이디, 'Imp').length,
          goal: 2,
          stallMs: 60_000,
        },
      );
    } catch (e) {
      멈춤 = e;
    }
    const 내처치 = 처치줄(줄들, 나.아이디, 'Imp');
    const 공식값 = 반올림((12 * (100 + 10 * (4 - 1))) / 100);
    const 경험치 = await verify.log('내 임프 처치 줄 경험치가 전부 반올림(12 × 1.3) 이다', 내처치.map((줄) => 줄.exp), 공식값, { least: 2 });
    const 파티원 = await verify.log(
      '파티원마다 임프 처치 줄 수가 내 처치 줄 수와 같다',
      [두번째, 세번째, 네번째].map((봇) => 처치줄(줄들, 봇.아이디, 'Imp').length),
      내처치.length,
      { least: 3 },
    );
    await verify('BRM-REQ-284 4명 파티로 잡은 임프 처치 경험치는 반올림(12 × 1.3) = 16 이다', 경험치, true);
    await verify('BRM-REQ-126 파티원마다 받은 처치 줄 수가 내 처치 줄 수와 같다', 파티원, true);
    const 조건 = { 레벨: 1, 직업: '탱커', 무기: '-', 갑옷: '-', 인원: 4 };
    for (const 줄 of 설명안되는줄(줄들, 나.아이디, 조건, ['hit', 'kill', 'item']).slice(0, 10)) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});

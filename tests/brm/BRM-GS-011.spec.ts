import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 함께던전으로 } from './helpers/dungeon-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { type 로그줄, 맞을때까지기다리기, 미션로그, 받은피해, 설명안되는줄, 임프있게하기, 적치우고레벨맞추기 } from './helpers/mission-log.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-GS-011',
  name: 'BRM-REQ-103 레벨 1 탱커가 「방패 오라」를 누르자마자 떼고 3명 던전에서 임프에게 맞은 피해는 15 × 0.5 = 7.5 의 소수점 아래를 버린 7 이다',
  platforms: ['android'],
  precondition: ['탱커 · 레벨 1 · 장비 없음 · 던전 3명(두 번째 · 세 번째 플레이어 봇)'],
  elements: ['monster:임프', 'skill:방패 오라', 'state:레벨=1', 'state:던전 인원=3', 'state:직업=탱커'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 두번째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  const 세번째 = 계정꺼내기(params.p3Id, params.p3Password, '세 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 · 두 번째 · 세 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 두번째);
    await 계정되돌리기(admin, 세번째);
  });
  await test.step('탱커로 두 번째 · 세 번째 플레이어 봇과 3명이 던전에 들어가 적을 치우고 레벨 1 로 맞춘다', async () => {
    await 함께던전으로(game, driver, admin, 나, [{ 계정: 두번째, 자리: 2 }, { 계정: 세번째, 자리: 4 }], 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
    await 적치우고레벨맞추기(game, 1);
  });
  const 로그 = await gameLog(미션로그(admin));
  await test.step('불러낸 임프 곁에서 「방패 오라」(스킬 1)를 누르자마자 떼기를 되풀이하며 임프에게 3번 맞는다', async () => {
    const 던전 = await 던전화면.열기(game);
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(
        async () => {
          await 임프있게하기(game);
          await 던전.누르기('스킬 1');
          await 맞을때까지기다리기(game, 4_000);
        },
        {
          progress: async () => 받은피해((줄들 = await 로그.lines()), 나.아이디, 'Imp').length,
          goal: 3,
          stallMs: 60_000,
        },
      );
    } catch (e) {
      멈춤 = e;
    }
    const 값들 = 받은피해(줄들, 나.아이디, 'Imp').map((줄) => 줄.value);
    const 반감 = await verify.log('「방패 오라」를 켠 동안 임프가 나를 친 피해 줄이 전부 7 이다', 값들, 7, { least: 3 });
    await verify('BRM-REQ-103 레벨 1 탱커가 「방패 오라」를 누르자마자 떼고 3명 던전에서 임프에게 맞은 피해는 15 × 0.5 = 7.5 의 소수점 아래를 버린 7 이다', 반감, true);
    const 조건 = { 레벨: 1, 직업: '탱커', 무기: '-', 갑옷: '-', 인원: 3 };
    for (const 줄 of 설명안되는줄(줄들, 나.아이디, 조건, ['hit']).slice(0, 10)) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});

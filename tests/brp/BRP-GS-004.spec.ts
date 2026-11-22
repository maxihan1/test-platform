import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { type 로그줄, 받은피해, 설명안되는줄 } from './helpers/game-log.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM스탯, 스탯숫자 } from './helpers/gm.helper.js';
import { 내로그, 던전을비우고레벨맞추기, 봇과던전들어가기, 봇쓰러뜨리기, 알려진줄, 임프곁에서기, 장비갖추기 } from './helpers/mission.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-GS-004',
  name: '셋이 든 던전에서 레벨 1 탱커가 장비 없이 임프에게 맞는 동안 받은 피해가 기획서 값이다',
  platforms: ['windows'],
  precondition: ['탱커 · 레벨 1 · 장비 없음 · 던전 인원 3(두 봇은 쓰러져 있음)'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  const 둘 = { 아이디: params.p2Id ?? '', 비밀번호: params.p2Password ?? '' };
  const 셋 = { 아이디: params.p3Id ?? '', 비밀번호: params.p3Password ?? '' };
  await test.cleanup('방을 로비로 돌리고 계정을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘.아이디, 둘.비밀번호, 'base');
    await 계정되돌리기(admin, 셋.아이디, 셋.비밀번호, 'base');
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('탱커 · 레벨 1 로 두 봇과 던전에 들어와 두 봇을 쓰러뜨린 것을 확인한다', async () => {
    await 장비갖추기(game, 1, null);
    const { 봇이름들 } = await 봇과던전들어가기(admin, game, [둘, 셋], '탱커');
    await 던전을비우고레벨맞추기(game, 1);
    await 봇쓰러뜨리기(admin, 봇이름들);
    await verify('/gm stat 레벨이 1 이다', 스탯숫자(await GM스탯(game), '레벨'), 1, { blocker: true });
  });

  const 던전 = await 던전화면.열림(game);
  const 로그 = await gameLog(내로그(admin, 아이디));
  await test.step('무적을 끈 채 불러낸 임프 곁에 서서 맞기', async () => {
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(() => 임프곁에서기(game, 던전), {
        progress: async () => 받은피해((줄들 = await 로그.lines()), 아이디).length,
        goal: 1,
        stallMs: 60_000,
      });
    } catch (e) {
      멈춤 = e;
    }
    await verify.log('BRP-REQ-377 받은 피해 줄: 전부 15 (최소 1줄)', 받은피해(줄들, 아이디, 'Imp').map((줄) => 줄.value), 15);
    await verify.log('BRP-REQ-105 받은 피해 줄: 전부 반올림(15 × (1 − 0)) = 15 (최소 1줄)', 받은피해(줄들, 아이디, 'Imp').map((줄) => 줄.value), Math.round(15 * (1 - 0)));
    for (const 줄 of 설명안되는줄(줄들, 알려진줄(3))) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});

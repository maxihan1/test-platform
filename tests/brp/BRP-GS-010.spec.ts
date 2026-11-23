import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기, 방로비로 } from './helpers/game-enter.helper.js';
import { type 로그줄, 설명안되는줄, 아이템줄, 처치줄 } from './helpers/game-log.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM보스방가기, GM무적바꾸기, GM스탯, 스탯숫자 } from './helpers/gm.helper.js';
import { 퀘스트처음으로 } from './helpers/items.helper.js';
import { 내로그, 던전을비우고레벨맞추기, 알려진줄, 장비갖추기 } from './helpers/mission.helper.js';
import { 못닿음, 보상받고차이읽기, type 보상결과, 보스몇초치기, 보스에준피해, 완료알림봄, 퀘스트상태 } from './helpers/quest-flow.helper.js';
import { 결과화면 } from './pages/postgame.page.js';
import { 던전화면 } from './pages/dungeon.page.js';

const 퀘스트 = '던전 보스 처치';
const 잡음 = Number.MAX_SAFE_INTEGER;

export const spec = defineCase({
  tcId: 'BRP-GS-010',
  name: '레벨 30 탱커가 혼자 보스 임프를 실제로 잡아 「던전 보스 처치」 퀘스트를 끝내고 보상을 받으면 처치 보상 · 완료 알림 · 퀘스트 보상이 기획서대로다',
  platforms: ['windows'],
  precondition: ['탱커 · 레벨 30 · 장비 없음 · 파티 없음 · 혼자 · 무적 · 오늘 퀘스트 처음 상태 · 보스 방'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('방을 로비로 돌리고 계정을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('탱커 · 레벨 30 · 무적으로 혼자 던전에 들어와 오늘 퀘스트를 처음으로 돌린 것을 확인한다', async () => {
    await 장비갖추기(game, 30, null);
    await 던전입장(game, '탱커');
    await 던전을비우고레벨맞추기(game, 30);
    const 진행 = await 퀘스트처음으로(game);
    await GM무적바꾸기(game);
    await verify('/gm stat 레벨이 30 이다', 스탯숫자(await GM스탯(game), '레벨'), 30, { blocker: true });
    await verify('일일 퀘스트 진행이 모두 0 이다', 진행.split(' · ').every((칸) => 칸.startsWith('0/')), true, { blocker: true });
  });

  const 던전 = await 던전화면.열림(game);
  await GM보스방가기(game);
  const 로그 = await gameLog(내로그(admin, 아이디));
  await test.step('보스 방에서 보스 임프를 공격해 처치하고 로비에서 「던전 보스 처치」 보상을 받는다', async () => {
    const 처음 = await 퀘스트상태(game, 퀘스트);
    let 줄들: 로그줄[] = [];
    let 알림: boolean | undefined;
    let 채움: { 진행: string; 받기눌림: boolean } | undefined;
    let 보상: 보상결과 | undefined;
    let 멈춤: unknown;
    try {
      await repeatUntil(() => 보스몇초치기(game, 던전), {
        progress: async () => {
          줄들 = await 로그.lines();
          return 처치줄(줄들, 아이디, 'ImpBoss').length > 0 ? 잡음 : 보스에준피해(줄들, 아이디).length;
        },
        goal: 잡음,
        stallMs: 60_000,
      });
      알림 = await 완료알림봄(game, 퀘스트, 3_000);
      await 결과화면.뜰때까지(game, 30_000);
      await 방로비로(admin, game);
      채움 = await 퀘스트상태(game, 퀘스트);
      보상 = await 보상받고차이읽기(game, [퀘스트]);
    } catch (e) {
      멈춤 = e;
    }
    const 보스처치 = 처치줄(줄들, 아이디, 'ImpBoss');
    await verify.log('BRP-REQ-124 보스 처치 줄 경험치: 반올림(300 × 1 × 1) = 300 (최소 1줄)', 보스처치.map((줄) => 줄.exp), Math.round(300 * 1 * 1));
    await verify.log('BRP-REQ-131 보스 처치 줄 골드: 반올림(200 × 1) = 200 (최소 1줄)', 보스처치.map((줄) => 줄.gold), Math.round(200 * 1));
    await verify.log('BRP-REQ-132 보스 처치 한 번의 아이템 줄 수: 1 (최소 1줄)', 보스처치.length === 0 ? [] : [아이템줄(줄들, 아이디).length], 1);
    await verify('BRP-REQ-225 보스를 잡기 전(0/1)에는 「보상 받기」가 눌리지 않는다', 처음.받기눌림, false);
    await verify('BRP-REQ-224 보스를 잡는 순간 「퀘스트 완료: 던전 보스 처치 — 퀘스트 창에서 보상을 받으세요」 알림이 뜬다', 알림 ?? 못닿음, true);
    await verify('BRP-REQ-225 진행이 「1/1」이면 「보상 받기」가 눌린다', 채움 === undefined ? 못닿음 : 채움.진행 === '1/1' && 채움.받기눌림, true);
    await verify('BRP-REQ-358 보상 받기 앞뒤 골드 차이는 300 이다', 보상?.골드 ?? 못닿음, 300);
    await verify('BRP-REQ-358 보상 받기 앞뒤 경험치 차이는 400 이다', 보상?.경험치 ?? 못닿음, 400);
    await verify('BRP-REQ-228 보상을 받은 뒤에는 「보상 받기」가 다시 눌리지 않는다', 보상?.다시눌림 ?? 못닿음, false);
    for (const 줄 of 설명안되는줄(줄들, 알려진줄(1))) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});

import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 불러내기, 적모두처치, 전리품원래대로, 체력채우기 } from './helpers/game-state.helper.js';
import { type 로그줄, 미션로그, 설명안되는줄, 적치우고레벨맞추기, 처치마다전리품 } from './helpers/mission-log.helper.js';

export const spec = defineCase({
  tcId: 'BRM-GS-008',
  name: '레벨 1 탱커가 장비 없이 혼자 임프 40마리를 잡는 동안 전리품이 나온 비율이 기획서 확률이다',
  platforms: ['android'],
  precondition: ['탱커 · 레벨 1 · 장비 없음 · 혼자 던전 · 전리품 원래 확률'],
  elements: ['monster:임프', 'drop:임프', 'item:임프의 뿔', 'item:체력 물약', 'state:레벨=1'],
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
  await test.step('탱커로 혼자 던전에 들어가 적을 치우고 레벨 1 · 전리품 원래 확률로 맞춘다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
    await 적치우고레벨맞추기(game, 1);
    await 전리품원래대로(game);
  });
  const 로그 = await gameLog(미션로그(admin));
  await test.step('임프를 불러내고 「/gm killall」로 잡기를 되풀이해 임프 40마리를 잡는다', async () => {
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(
        async () => {
          await 불러내기(game, 'imp');
          await 불러내기(game, 'imp');
          await 적모두처치(game);
          await 체력채우기(game);
        },
        {
          progress: async () => 처치마다전리품((줄들 = await 로그.lines()), 나.아이디, 'Imp').length,
          goal: 40,
          stallMs: 90_000,
        },
      );
    } catch (e) {
      멈춤 = e;
    }
    const 묶음 = 처치마다전리품(줄들, 나.아이디, 'Imp');
    const 처치수 = 묶음.length;
    const 뿔 = 묶음.filter((x) => x.includes('임프의 뿔')).length;
    const 물약 = 묶음.filter((x) => x.includes('체력 물약')).length;
    const 둘다 = 묶음.filter((x) => x.includes('임프의 뿔') && x.includes('체력 물약')).length;
    const 뿔비율 = await verify.rates('처치마다 「임프의 뿔」 아이템 줄이 있는 비율', { '임프의 뿔': 뿔, 없음: 처치수 - 뿔 }, { '임프의 뿔': 0.3, 없음: 0.7 }, 0.22);
    const 물약비율 = await verify.rates('처치마다 「체력 물약」 아이템 줄이 있는 비율', { '체력 물약': 물약, 없음: 처치수 - 물약 }, { '체력 물약': 0.08, 없음: 0.92 }, 0.13);
    const 둘다비율 = await verify.rates('처치마다 두 아이템 줄이 같이 있는 비율', { 둘다: 둘다, 아님: 처치수 - 둘다 }, { 둘다: 0.024, 아님: 0.976 }, 0.08);
    await verify('BRM-REQ-128 임프 처치에서 「임프의 뿔」이 나온 비율은 30% 다', 뿔비율, true);
    await verify('BRM-REQ-129 임프 처치에서 「체력 물약」이 나온 비율은 8% 다', 물약비율, true);
    await verify('BRM-REQ-130 임프 처치에서 두 전리품이 같이 나온 비율은 따로 굴린 값 30% × 8% = 2.4% 다', 둘다비율, true);
    const 조건 = { 레벨: 1, 직업: '탱커', 무기: '-', 갑옷: '-', 인원: 1 };
    for (const 줄 of 설명안되는줄(줄들, 나.아이디, 조건, ['hit', 'kill', 'item', 'levelup']).slice(0, 10)) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});

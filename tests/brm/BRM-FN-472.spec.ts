import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에서끼기, 가방에있나, 사기 } from './helpers/dungeon-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { GM상태, 계정꺼내기, 계정되돌리기, 골드맞추기, 레벨맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-472',
  name: '레벨 5 에 사슬 갑옷을 끼면 방어율이 0.04 + 0.15 = 0.19 다',
  platforms: ['android'],
  precondition: ['일반 회원이 사슬 갑옷을 가지고 로비에 있다'],
  elements: ['item:사슬 갑옷', 'level:5'],
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
  await test.step('일반 회원이 사슬 갑옷을 가지고 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await 골드맞추기(game, 1000);
    await 사기(game, '사슬 갑옷');
    await verify('가방에 사슬 갑옷이 있다', await 가방에있나(game, '사슬 갑옷'), true, { blocker: true });
  });
  await test.step('「/gm level 5」 뒤 사슬 갑옷을 끼고 「/gm stat」 첫 줄을 읽는다', async () => {
    await 레벨맞추기(game, 5);
    await 가방에서끼기(game, '사슬 갑옷', '갑옷');
    const 상태 = await GM상태(game);
    await verify('레벨 5 에 사슬 갑옷을 끼면 방어율이 0.04 + 0.15 = 0.19 다', Number(상태['방어율']), 0.19);
  });
});

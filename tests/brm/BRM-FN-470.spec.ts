import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에서끼기, 가방에있나, 사기, 장착풀기 } from './helpers/dungeon-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { GM상태, 계정꺼내기, 계정되돌리기, 골드맞추기, 레벨맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-470',
  name: '레벨 30 에 룬 새김 도끼를 끼면 공격 배율이 1 + 0.87 + 0.20 = 2.07 이다',
  platforms: ['android'],
  precondition: ['일반 회원이 룬 새김 도끼를 가지고 로비에 있다', '일반 회원이 강철 롱소드를 가지고 로비에 있다'],
  elements: ['item:룬 새김 도끼', 'item:강철 롱소드', 'level:30', 'level:5'],
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
  await test.step('일반 회원이 룬 새김 도끼를 가지고 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await 골드맞추기(game, 2000);
    await 사기(game, '룬 새김 도끼');
    await verify('가방에 룬 새김 도끼가 있다', await 가방에있나(game, '룬 새김 도끼'), true, { blocker: true });
  });
  await test.step('일반 회원이 강철 롱소드를 가지고 로비에 있다', async () => {
    await 사기(game, '강철 롱소드');
    await verify('가방에 강철 롱소드가 있다', await 가방에있나(game, '강철 롱소드'), true, { blocker: true });
  });
  await test.step('「/gm level 30」 뒤 룬 새김 도끼를 끼고 「/gm stat」 첫 줄을 읽는다', async () => {
    await 레벨맞추기(game, 30);
    await 가방에서끼기(game, '룬 새김 도끼', '무기');
    const 상태 = await GM상태(game);
    await verify('레벨 30 에 룬 새김 도끼를 끼면 공격 배율이 1 + 0.87 + 0.20 = 2.07 이다', Number(상태['공격배율']), 2.07);
  });
  await test.step('「/gm level 5」 뒤 강철 롱소드를 끼고 「/gm stat」 첫 줄을 읽는다', async () => {
    await 레벨맞추기(game, 5);
    await 장착풀기(game, '무기');
    await 가방에서끼기(game, '강철 롱소드', '무기');
    const 상태 = await GM상태(game);
    await verify('공격 배율이 1.24 다', Number(상태['공격배율']), 1.24);
  });
});

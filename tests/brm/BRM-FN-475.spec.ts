import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에서끼기, 가방에있나, 사기, 장착풀기 } from './helpers/dungeon-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { GM상태, 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-475',
  name: '행운의 반지를 끼면 골드 배율이 1.2 다',
  platforms: ['android'],
  precondition: ['일반 회원이 행운의 반지를 가지고 로비에 있다', '일반 회원으로 로비에 들어와 있다'],
  elements: ['item:행운의 반지', 'rate:임프 골드'],
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
  await test.step('일반 회원이 행운의 반지를 가지고 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await 골드맞추기(game, 1000);
    await 사기(game, '행운의 반지');
    await verify('가방에 행운의 반지가 있다', await 가방에있나(game, '행운의 반지'), true, { blocker: true });
  });
  await test.step('행운의 반지를 끼고 「/gm stat」 첫 줄을 읽는다', async () => {
    await 가방에서끼기(game, '행운의 반지', '장신구');
    const 상태 = await GM상태(game);
    await verify('행운의 반지를 끼면 골드 배율이 1.2 다', Number(상태['골드배율']), 1.2);
  });
  await test.step('장신구 없이 「/gm stat」 첫 줄을 읽는다', async () => {
    await 장착풀기(game, '장신구');
    const 상태 = await GM상태(game);
    await verify('골드 배율이 1 이다', Number(상태['골드배율']), 1);
  });
});

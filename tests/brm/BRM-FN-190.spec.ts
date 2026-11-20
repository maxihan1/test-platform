import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방채우기, 장착하기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, GM상태 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-190',
  name: '녹슨 단검을 장착하면 「/gm stat」 공격 배율이 1.05 로 바로 바뀐다',
  platforms: ['android'],
  precondition: ['일반 회원이 녹슨 단검 · 가죽 갑옷 · 행운의 반지 · 현자의 목걸이를 가지고 로비에 있다', '일반 회원이 가죽 갑옷을 가지고 로비에 있다', '일반 회원이 행운의 반지를 가지고 로비에 있다', '일반 회원이 현자의 목걸이를 장착하고 로비에 있다'],
  elements: ['item:녹슨 단검', 'item:가죽 갑옷', 'item:행운의 반지', 'item:현자의 목걸이'],
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
  await test.step('일반 회원이 가방에 녹슨 단검 · 가죽 갑옷 · 행운의 반지 · 현자의 목걸이를 갖춘다', async () => {
    await 로비로(game, driver, 나);
    await 가방채우기(game, admin, 나, [{ 이름: '녹슨 단검', 개수: 1 }, { 이름: '가죽 갑옷', 개수: 1 }, { 이름: '행운의 반지', 개수: 1 }, { 이름: '현자의 목걸이', 개수: 1 }]);
    const 가방 = await 가방창.열기(game);
    await verify('가방에 현자의 목걸이 줄이 있다', await 가방.이름줄수('현자의 목걸이'), 1, { blocker: true });
  });
  await test.step('장비를 장착하고 해제하며 「/gm stat」 첫 줄을 읽는다', async () => {
    await 장착하기(game, '녹슨 단검');
    const 상태 = await GM상태(game);
    await verify('녹슨 단검을 장착하면 「/gm stat」 공격 배율이 1.05 로 바로 바뀐다', 상태['공격배율'], '1.05');
  });
  await test.step('가죽 갑옷을 장착하고 「/gm stat」 첫 줄을 읽는다', async () => {
    await 장착하기(game, '가죽 갑옷');
    const 상태 = await GM상태(game);
    await verify('「/gm stat」 방어율이 0.08 로 바로 바뀐다', 상태['방어율'], '0.08');
  });
  await test.step('행운의 반지를 장착하고 「/gm stat」 첫 줄을 읽는다', async () => {
    await 장착하기(game, '행운의 반지');
    const 상태 = await GM상태(game);
    await verify('「/gm stat」 골드 배율이 1.2 로 바로 바뀐다', 상태['골드배율'], '1.2');
  });
  await test.step('일반 회원이 현자의 목걸이를 장착한다', async () => {
    await 장착하기(game, '현자의 목걸이');
    const 상태 = await GM상태(game);
    await verify('「/gm stat」 경험치 배율이 1.2 다', 상태['경험치배율'], '1.2', { blocker: true });
  });
  await test.step('현자의 목걸이를 해제하고 「/gm stat」 첫 줄을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    await 가방.해제누르기('장신구');
    await 가방.줄이름뜰때까지('현자의 목걸이');
    const 상태 = await GM상태(game);
    await verify('「/gm stat」 경험치 배율이 1 로 바로 바뀐다', 상태['경험치배율'], '1');
  });
});

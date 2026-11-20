import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 골드숫자가될때까지, 상점줄구매, 토스트모두사라질때까지, 토스트수 } from './helpers/login-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-446',
  name: '알림이 4개면 4개 모두 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 골드 2,000 으로 로비에 있다'],
  techniques: ['경계값 분석'],
  elements: ['shop:체력 물약', 'flow:골드-상점 구매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    한도안횟수: z.number().int().min(1).describe('연달아 사는 횟수 — 알림 한도 안').default(4),
    한도밖횟수: z.number().int().min(1).describe('연달아 사는 횟수 — 알림 한도 밖').default(5),
  }),
  expected: z.object({
    물약값: z.number().describe('체력 물약 한 개 값').default(30),
    한도안알림수: z.number().int().describe('한도 안에서 보이는 알림 수').default(4),
    한도밖알림수: z.number().int().describe('한도 밖에서 보이는 알림 수').default(4),
  }),
});

test(spec, async ({ game, driver, admin, params, expected }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  const hud = new 공통HUD(game);
  await test.step('일반 회원으로 로비에 들어가 골드를 2,000 으로 맞춘다', async () => {
    await 로비로(game, driver, 나);
    await 골드맞추기(game, 2000);
    await 골드숫자가될때까지(game, 2000);
    await verify('골드가 2,000 이다', await hud.골드값(), 2000, { blocker: true });
  });
  await test.step('체력 물약을 빠르게 네 번 산다', async () => {
    await 토스트모두사라질때까지(game);
    const 상점 = await 상점창.열기(game);
    await 상점줄구매(game, 상점, '체력 물약', params.한도안횟수);
    await 골드숫자가될때까지(game, 2000 - expected.물약값 * params.한도안횟수);
    await verify('알림이 4개면 4개 모두 보인다', await 토스트수(game), expected.한도안알림수);
  });
  await test.step('체력 물약을 빠르게 다섯 번 산다', async () => {
    await 골드맞추기(game, 2000);
    await 골드숫자가될때까지(game, 2000);
    await 토스트모두사라질때까지(game);
    const 상점 = await 상점창.열기(game);
    await 상점줄구매(game, 상점, '체력 물약', params.한도밖횟수);
    await 골드숫자가될때까지(game, 2000 - expected.물약값 * params.한도밖횟수);
    await verify('가장 오래된 알림이 지워져 4개만 보인다', await 토스트수(game), expected.한도밖알림수);
  });
});

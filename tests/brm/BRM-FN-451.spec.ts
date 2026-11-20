import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 아이템표읽기, 표값글 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-451',
  name: '「/gm data item」을 보내면 장신구 · 물약 · 전리품 5종 값이 아이템 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['item:행운의 반지', 'item:현자의 목걸이', 'item:체력 물약', 'item:임프의 뿔', 'item:보스의 왕관 조각'],
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
  const hud = new 공통HUD(game);
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
  });
  await test.step('「/gm data item」을 보내 장신구 · 물약 · 전리품 줄을 읽는다', async () => {
    const 표 = await 아이템표읽기(game);
    const 값 = (이름: string): string => 표값글(표.find((줄) => 줄.이름 === 이름));
    const a = await verify.element('행운의 반지 표 값이 아이템 표와 같다', 'item:행운의 반지', 값('행운의 반지'), '장신구 · 희귀 · 상점가 300 · 판매가 75');
    const b = await verify.element('현자의 목걸이 표 값이 아이템 표와 같다', 'item:현자의 목걸이', 값('현자의 목걸이'), '장신구 · 희귀 · 상점가 300 · 판매가 75');
    const c = await verify.element('체력 물약 표 값이 아이템 표와 같다', 'item:체력 물약', 값('체력 물약'), '물약 · 일반 · 상점가 30 · 판매가 7');
    const d = await verify.element('임프의 뿔 표 값이 아이템 표와 같다', 'item:임프의 뿔', 값('임프의 뿔'), '전리품 · 일반 · 상점가 없음 · 판매가 10');
    const e = await verify.element('보스의 왕관 조각 표 값이 아이템 표와 같다', 'item:보스의 왕관 조각', 값('보스의 왕관 조각'), '전리품 · 영웅 · 상점가 없음 · 판매가 200');
    await verify('「/gm data item」을 보내면 장신구 · 물약 · 전리품 5종 값이 아이템 표와 같다', a && b && c && d && e, true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-476',
  name: '서버 데이터에서 장신구 · 물약 · 전리품 줄을 읽으면 등급 · 상점가 · 판매가 · 효과가 아이템 표와 같다',
  platforms: ['android'],
  held: '보류 — 아이템 표 값을 읽는 게임 데이터 API 가 없다',
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['item:lucky_ring', 'item:sage_necklace', 'item:health_potion', 'item:imp_horn', 'item:boss_crown_shard'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    서버줄: z.string().describe('서버 데이터에서 읽은 장신구 · 물약 · 전리품 줄 — 이름 · 등급 · 상점가 · 판매가 · 효과를 「 / 」로 이은 글'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('서버 데이터에서 장신구 · 물약 · 전리품 줄을 읽는다', async () => {
      await verify('서버 데이터에서 장신구 · 물약 · 전리품 줄을 읽으면 등급 · 상점가 · 판매가 · 효과가 아이템 표와 같다', params.서버줄, '행운의 반지 · 희귀 · 300 · 75 · 골드 획득 +20% / 현자의 목걸이 · 희귀 · 300 · 75 · 경험치 획득 +20% / 체력 물약 · 일반 · 30 · 7 · 기본 체력 50% 회복 / 임프의 뿔 · 일반 · 없음 · 10 / 보스의 왕관 조각 · 영웅 · 없음 · 200');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});

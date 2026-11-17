import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 데이터읽기, 아이템표글 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-476',
  name: '서버 데이터에서 장신구 · 물약 · 전리품 줄을 읽으면 등급 · 상점가 · 판매가 · 효과가 아이템 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['item:lucky_ring', 'item:sage_necklace', 'item:health_potion', 'item:imp_horn', 'item:boss_crown_shard'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
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

    await test.step('GM 명령으로 아이템 데이터를 읽는다', async () => {
      const 줄들 = await 데이터읽기(game, 'item');
      const 값들 = [
        await verify.element('「행운의 반지」 줄이 아이템 표와 같다', 'item:lucky_ring', 아이템표글(줄들, '행운의 반지'), '희귀 · 300 · 75 · 골드 획득 +20%'),
        await verify.element('「현자의 목걸이」 줄이 아이템 표와 같다', 'item:sage_necklace', 아이템표글(줄들, '현자의 목걸이'), '희귀 · 300 · 75 · 경험치 획득 +20%'),
        await verify.element('「체력 물약」 줄의 등급 · 상점가 · 판매가가 아이템 표와 같다', 'item:health_potion', 아이템표글(줄들, '체력 물약'), '일반 · 30 · 7'),
        await verify('「조약돌」 줄의 등급 · 상점가 · 판매가가 아이템 표와 같다', 아이템표글(줄들, '조약돌'), '일반 · 3 · 1'),
        await verify.element('「임프의 뿔」 줄의 등급 · 상점가 · 판매가가 아이템 표와 같다', 'item:imp_horn', 아이템표글(줄들, '임프의 뿔'), '일반 · 없음 · 10'),
        await verify.element('「보스의 왕관 조각」 줄의 등급 · 상점가 · 판매가가 아이템 표와 같다', 'item:boss_crown_shard', 아이템표글(줄들, '보스의 왕관 조각'), '영웅 · 없음 · 200'),
      ];
      await verify('서버 데이터에서 장신구 · 물약 · 전리품 줄을 읽으면 등급 · 상점가 · 판매가 · 효과가 아이템 표와 같다', 값들.every(Boolean), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-322',
  name: '상점 창에 제목 「상점」, 오른쪽 위 「보유 골드 200」, 「녹슨 단검」 줄의 설명 · 「80 G」 · 「구매」, 「닫기」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['item:rusty_dagger'],
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
    await test.step('상점 창을 연다', async () => {
      const 상점 = await 상점창.열기(game);
      const 제목 = await verify('창 제목이 「상점」이다', await 상점.글(상점창.제목), '상점');
      const 골드 = await verify('오른쪽 위에 「보유 골드 200」이 보인다', await 상점.글(상점창.보유골드), '보유 골드 200');
      const 설명 = await verify('「녹슨 단검」 줄에 설명이 보인다', (await 상점.줄칸글('녹슨 단검', 1)) !== '', true);
      const 가격 = await verify('「녹슨 단검」 줄에 「80 G」가 보인다', await 상점.줄칸글('녹슨 단검', 2), '80 G');
      const 구매 = await verify('「녹슨 단검」 줄의 「구매」가 보인다', await 상점.줄버튼글('녹슨 단검', '구매'), '구매');
      const 닫기 = await verify('「닫기」가 보인다', await 상점.닫기글(), '닫기');
      await verify('상점 창에 제목 「상점」, 오른쪽 위 「보유 골드 200」, 「녹슨 단검」 줄의 설명 · 「80 G」 · 「구매」, 「닫기」가 보인다', 제목 && 골드 && 설명 && 가격 && 구매 && 닫기, true);
      const 배치 = await game.layout(상점창.창);
      await verify('상점 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});

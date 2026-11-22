import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 보스전리품받기, 상점에서사기 } from './helpers/items.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM골드 } from './helpers/gm.helper.js';
import { 가방줄, 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-167',
  name: '가방 창에서 아이템 이름 색을 읽으면 가방의 아이템 이름 색이 일반 #E8E2D6 · 희귀 #5AB8FF · 영웅 #C77DFF · 전설 #FF9A3C 다',
  platforms: ['windows'],
  precondition: ['일반 회원 가방에 일반 · 희귀 · 영웅 · 전설 아이템이 하나씩 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('방을 로비로 돌리고 일반 회원을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('가방에 일반 · 희귀 · 영웅 · 전설 아이템이 하나씩 있는 것을 확인한다', async () => {
    await 보스전리품받기(admin, game, '불꽃의 검');
    await GM골드(game, 2000);
    await 상점에서사기(game, ['강철 롱소드', '룬 새김 도끼']);
    const 가방 = await 가방창.열기(game);
    await 가방.줄이생길때까지('룬 새김 도끼');
    const 이름들 = (await 가방.줄들()).map((줄) => 줄.이름).sort().join(' · ');
    await 가방.닫기();
    const 기대 = ['체력 물약', '강철 롱소드', '룬 새김 도끼', '불꽃의 검'].sort().join(' · ');
    await verify('가방에 체력 물약 · 강철 롱소드 · 룬 새김 도끼 · 불꽃의 검이 있다', 이름들, 기대, { blocker: true });
  });

  await test.step('가방 창에서 아이템 이름 색을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    const 줄들 = await 가방.줄들();
    const 색 = (이름: string): string | null => {
      const 줄 = 줄들.find((칸: 가방줄) => 칸.이름 === 이름);
      return 줄 === undefined ? null : 가방창.이름색(줄);
    };
    await 가방.닫기();
    const 일반 = await verify('일반 아이템 이름 색이 #E8E2D6 다', 색('체력 물약'), '#E8E2D6');
    const 희귀 = await verify('희귀 아이템 이름 색이 #5AB8FF 다', 색('강철 롱소드'), '#5AB8FF');
    const 영웅 = await verify('영웅 아이템 이름 색이 #C77DFF 다', 색('룬 새김 도끼'), '#C77DFF');
    const 전설 = await verify('전설 아이템 이름 색이 #FF9A3C 다', 색('불꽃의 검'), '#FF9A3C');
    await verify('가방 창에서 아이템 이름 색을 읽으면 가방의 아이템 이름 색이 일반 #E8E2D6 · 희귀 #5AB8FF · 영웅 #C77DFF · 전설 #FF9A3C 다', 일반 && 희귀 && 영웅 && 전설, true);
  });
});

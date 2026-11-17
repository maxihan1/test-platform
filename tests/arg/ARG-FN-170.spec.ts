import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드, 저장될때까지 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-170',
  name: '골드 200 으로 「녹슨 단검」을 사면 골드가 80 줄어 120 이 되고 가방에 「녹슨 단검」이 들어온다',
  platforms: ['android'],
  smoke: true,
  precondition: ['일반 회원이 로비에서 상점 창을 열었다'],
  elements: ['item:rusty_dagger', 'flow:골드-상점구매'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로비에서 상점 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 상점창.열기(game);
    });
    const 상점 = 상점창.지금(game);
    await test.step('상점 창과 보유 골드를 확인한다', async () => {
      await verify('상점 창에 보유 골드 200 이 보인다', await 상점.글(상점창.보유골드), '보유 골드 200', { blocker: true });
    });

    await test.step('「녹슨 단검」 줄의 「구매」를 누른다', async () => {
      await 상점.구매('녹슨 단검');
      await game.waitFor(상점창.보유골드, { text: '120', timeoutMs: 10_000 }).catch(() => undefined);
      const 화면골드 = await verify('상단 바 골드가 120 이다', await 상단바골드(game), 120);
      const 서버골드 = await verify('서버에 저장된 골드가 120 이다', (await 저장될때까지(admin, 아이디, (값) => 값.골드 === 120)).골드, 120);
      await 상점.닫기누르기();
      const 가방 = await 가방창.열기(game);
      const 들어옴 = await verify('가방에 「녹슨 단검」 줄이 있다', (await 가방.목록.이름줄('녹슨 단검')) !== null, true);
      await verify('골드 200 으로 「녹슨 단검」을 사면 골드가 80 줄어 120 이 되고 가방에 「녹슨 단검」이 들어온다', 화면골드 && 서버골드 && 들어옴, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});

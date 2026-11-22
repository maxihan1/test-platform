import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-508',
  name: '채팅 띠를 읽으면 채팅 띠에 최근 채팅 2줄이 보인다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어 봇이 로비에서 전체 채팅 둘을 보냈다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    첫째글: z.string().min(1).max(100).describe('봇이 보낼 첫째 전체 채팅 글 — 100자 이하').default('QA 띠 첫째 글'),
    둘째글: z.string().min(1).max(100).describe('봇이 보낼 둘째 전체 채팅 글 — 100자 이하').default('QA 띠 둘째 글'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('봇을 끄고 방을 로비로 돌리기', () => 로비로되돌리기(admin));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('두 번째 플레이어 봇이 전체 채팅 둘을 보낸 것을 확인한다', async () => {
    const 봇 = await 봇켜기(admin, params.p2Id ?? '', params.p2Password ?? '');
    await 봇시키기(admin, 봇, `say:${params.첫째글}`);
    await 봇시키기(admin, 봇, `say:${params.둘째글}`);
    const 둘째뜸 = await game.waitFor(공통HUD.채팅띠글주소, { text: params.둘째글, timeoutMs: 15_000 }).then(
      () => true,
      () => false,
    );
    await verify('채팅 띠에 봇의 둘째 채팅이 뜬다', 둘째뜸, true, { blocker: true });
  });

  await test.step('채팅 띠를 읽는다', async () => {
    const 글 = await game.text(공통HUD.채팅띠글주소);
    const 첫째 = await verify('채팅 띠에 첫째 채팅이 보인다', 글.includes(params.첫째글), true);
    const 둘째 = await verify('채팅 띠에 둘째 채팅이 보인다', 글.includes(params.둘째글), true);
    await verify('채팅 띠를 읽으면 채팅 띠에 최근 채팅 2줄이 보인다', 첫째 && 둘째, true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 화면자리읽기 } from './helpers/dungeon.helper.js';
import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-509',
  name: '로비 채팅 띠 자리를 읽으면 로비에서 채팅 띠는 화면 오른쪽 아래에 있다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다', '일반 회원이 탱커로 혼자 던전에 들어와 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('방을 로비로 돌리기', () => 로비로되돌리기(admin));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('로비 채팅 띠 자리를 읽는다', async () => {
    const 자리 = await 화면자리읽기(game, 공통HUD.채팅띠);
    const 오른쪽 = await verify('로비 채팅 띠가 화면 오른쪽에 있다', 자리.가로 > 0.5, true);
    const 아래 = await verify('로비 채팅 띠가 화면 아래쪽에 있다', 자리.세로 > 0.5, true);
    await verify('로비 채팅 띠 자리를 읽으면 로비에서 채팅 띠는 화면 오른쪽 아래에 있다', 오른쪽 && 아래, true);
  });

  await test.step('일반 회원이 탱커로 던전에 들어온 것을 확인한다', async () => {
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });

  await test.step('던전 채팅 띠 자리를 읽는다', async () => {
    const 자리 = await 화면자리읽기(game, 공통HUD.채팅띠);
    const 왼쪽 = await verify('던전 채팅 띠가 화면 왼쪽에 있다', 자리.가로 < 0.5, true);
    const 아래 = await verify('던전 채팅 띠가 화면 아래쪽에 있다', 자리.세로 > 0.5, true);
    await verify('던전에서 채팅 띠는 화면 왼쪽 아래에 있다', 왼쪽 && 아래, true);
  });
});

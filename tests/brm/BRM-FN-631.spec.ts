import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 골드가값이될때까지, 로비준비 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기, 실패걸기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-631',
  name: '길드 저장이 실패하면 「길드를 만들지 못했습니다」가 뜨고 골드는 500 그대로다',
  platforms: ['android'],
  held: '보류 — 길드 저장 요청을 실패시킬 길 없음',
  precondition: ['일반 회원이 골드 500 으로 길드 없이 로비에 있고 길드 저장이 실패하도록 걸려 있다'],
  techniques: ['동등 분할'],
  elements: ['flow:골드-길드 만들기'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    실패경로: z.string().describe('길드 저장 요청 경로의 글자'),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원이 로비에 들어가 골드를 500 으로 맞춘다', async () => {
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    const hud = new 공통HUD(game);
    await 골드맞추기(game, 500);
    await verify('일반 회원의 골드가 500 이다', await 골드가값이될때까지(hud, 500), true, { blocker: true });
  });
  await test.step('길드 이름을 넣고 「만들기 · 500G」를 누른다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.이름넣기('qa631');
    await 실패걸기(admin, params.실패경로);
    await 길드.만들기누르기();
    const 알림 = await verify('「길드를 만들지 못했습니다」가 뜬다', await 길드.hud.알림뜸('길드를 만들지 못했습니다'), true);
    const 골드 = await verify('골드는 500 그대로다', await 길드.hud.골드값(), 500);
    await verify('길드 저장이 실패하면 「길드를 만들지 못했습니다」가 뜨고 골드는 500 그대로다', 알림 && 골드, true);
  });
});

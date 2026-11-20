import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 무기칸이될때까지 } from './helpers/login-tools.helper.js';
import { 게임다시켜기, 로그인하기, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 레벨맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-073',
  name: '레벨 · 골드 · 가방 · 장착 장비를 바꾸고 다시 로그인하면 바꾼 값이 그대로 남아 있다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:장소=로비', 'flow:골드-상점 구매', 'shop:녹슨 단검', 'shop:체력 물약'],
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
  await test.step('일반 회원으로 로비에 들어가 골드를 500 으로 맞춘다', async () => {
    await 로비로(game, driver, 나);
    await 골드맞추기(game, 500);
    await hud.골드가될때까지('500 G');
    await verify('상단 바 골드가 「500 G」다', await hud.골드글(), '500 G', { blocker: true });
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('레벨 · 골드 · 가방 · 장착을 바꾼 뒤 다시 로그인한다', async () => {
    await 레벨맞추기(game, 5);
    const 상점 = await 상점창.열기(game);
    const 단검줄 = await 상점.줄찾기('녹슨 단검');
    await verify('상점에 녹슨 단검 줄이 있다', 단검줄 !== null, true, { blocker: true });
    await 상점.구매누르기(단검줄 ?? 0);
    await verify('골드가 「420 G」가 된다', await 상점.hud.골드가될때까지('420 G'), true, { blocker: true });
    const 물약줄 = await 상점.줄찾기('체력 물약');
    await verify('상점에 체력 물약 줄이 있다', 물약줄 !== null, true, { blocker: true });
    await 상점.구매누르기(물약줄 ?? 0);
    await verify('골드가 「390 G」가 된다', await 상점.hud.골드가될때까지('390 G'), true, { blocker: true });
    const 가방 = await 가방창.열기(game);
    const 가방단검줄 = await 가방.줄찾기('녹슨 단검');
    await verify('가방에 녹슨 단검 줄이 있다', 가방단검줄 !== null, true, { blocker: true });
    await 가방.줄버튼누르기(가방단검줄 ?? 0, '장착');
    await verify('무기 칸에 녹슨 단검이 보인다', await 무기칸이될때까지(game, '녹슨 단검'), true, { blocker: true });
    await 게임다시켜기(game, driver);
    await 로그인하기(game, driver, 나);
    await hud.골드가될때까지('390 G');
    const 레벨 = await verify('「Lv.5」가 보인다', (await hud.레벨글()).startsWith('Lv.5 '), true);
    const 골드 = await verify('골드가 「390 G」다', await hud.골드글(), '390 G');
    const 다시연가방 = await 가방창.열기(game);
    const 물약 = await 다시연가방.줄찾기('체력 물약');
    const 가방값 = await verify('가방에 「체력 물약 x4」가 보인다', 물약 === null ? null : await 다시연가방.줄이름(물약), '체력 물약 x4');
    const 장착값 = await verify('무기 칸에 녹슨 단검이 보인다', ((await 다시연가방.칸내용('무기')) ?? '').includes('녹슨 단검'), true);
    await verify('레벨 · 골드 · 가방 · 장착 장비를 바꾸고 다시 로그인하면 바꾼 값이 그대로 남아 있다', 레벨 && 골드 && 가방값 && 장착값, true);
  });
});

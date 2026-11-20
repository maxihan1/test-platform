import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 길드생길때까지, 길드탈퇴하기, 서버골드 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-209',
  name: '골드 499 로 길드를 만들면 「길드를 만들려면 500 골드가 필요합니다」가 뜨고 골드는 499 그대로다',
  platforms: ['android'],
  precondition: ['일반 회원이 골드 499 로 길드 없이 로비에 있다', '일반 회원이 골드 500 으로 길드 없이 로비에 있다'],
  techniques: ['경계값 분석'],
  elements: ['flow:골드-길드 만들기', 'state:길드=없음', 'state:길드=길드장'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 길드 탈퇴 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 길드탈퇴하기(game);
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  const hud = new 공통HUD(game);
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
    const 길드 = await 길드창.열기(game);
    await verify('길드 창에 「만들기 · 500G」 버튼이 있다', await 길드.만들기버튼있나(), true, { blocker: true });
  });
  await test.step('일반 회원의 골드를 499 로 맞춘다', async () => {
    await 골드맞추기(game, 499);
    await verify('상단 바 골드가 「499 G」다', await hud.골드글(), '499 G', { blocker: true });
  });
  await test.step('길드 이름을 넣고 「만들기 · 500G」를 누른다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.이름넣기('qa209a');
    await 길드.만들기누르기();
    const 알림 = await verify('500 골드가 필요하다는 오류 알림이 뜬다', await hud.알림뜸('길드를 만들려면 500 골드가 필요합니다'), true);
    const 화면 = await verify('상단 바 골드가 「499 G」다', await hud.골드글(), '499 G');
    const 서버 = await verify('운영툴 캐릭터 골드가 499 다', await 서버골드(admin, 나), 499);
    await verify('골드 499 로 길드를 만들면 「길드를 만들려면 500 골드가 필요합니다」가 뜨고 골드는 499 그대로다', 알림 && 화면 && 서버, true);
  });
  await test.step('일반 회원의 골드를 500 으로 맞춘다', async () => {
    await 골드맞추기(game, 500);
    await verify('상단 바 골드가 「500 G」다', await hud.골드글(), '500 G', { blocker: true });
  });
  await test.step('골드 500 으로 길드 이름을 넣고 「만들기 · 500G」를 누른다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.이름넣기('qa209b');
    await 길드.만들기누르기();
    const 생김 = await verify('길드 창에 길드원 줄이 생긴다', await 길드생길때까지(game), true);
    await hud.골드가될때까지('0 G');
    const 화면 = await verify('상단 바 골드가 「0 G」다', await hud.골드글(), '0 G');
    const 서버 = await verify('운영툴 캐릭터 골드가 0 이다', await 서버골드(admin, 나), 0);
    await verify('길드가 생기고 골드가 0 이 된다', 생김 && 화면 && 서버, true);
  });
});

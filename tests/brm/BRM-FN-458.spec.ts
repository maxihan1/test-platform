import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 사기, 서버골드가될때까지, 알림사라질때까지, 임프서른마리처치, 퀘스트줄 } from './helpers/items-tools.helper.js';
import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 레벨맞추기, 보스방가기, 보스처치, 봇모두끄기, 퀘스트처음으로, GM상태 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-458',
  name: '세 퀘스트 보상을 모두 받으면 받기 전보다 골드가 500 는다',
  platforms: ['android'],
  precondition: ['일반 회원이 레벨 30 으로 세 퀘스트 목표를 다 채웠다'],
  elements: ['level:30', 'quest:임프 30마리 처치', 'quest:던전 보스 처치', 'quest:상점에서 물건 구매', 'flow:골드-일일 퀘스트'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  let 전골드 = 0;
  let 전경험치 = 0;
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  const hud = new 공통HUD(game);
  await test.step('일반 회원이 레벨 30 으로 세 퀘스트 목표를 다 채운다', async () => {
    await 던전으로(game, driver, 나, 0);
    await 레벨맞추기(game, 30);
    await 퀘스트처음으로(game);
    await 임프서른마리처치(game);
    await 사기(game, '체력 물약');
    await 보스방가기(game);
    await 보스처치(game);
    await new 던전화면(game).결과화면으로넘어갈때까지(60_000);
    await 로비로(game, driver, 나);
    const 퀘스트 = await 퀘스트창.열기(game);
    const 줄 = await 퀘스트줄(퀘스트, '임프 30마리 처치');
    await 퀘스트.줄진행이될때까지(줄, '30/30');
    await verify('「임프 30마리 처치」 진행이 「30/30」이다', await 퀘스트.줄진행(줄), '30/30', { blocker: true });
    전골드 = await 서버골드가될때까지(admin, 나, await hud.골드값());
    전경험치 = Number((await GM상태(game))['경험치'] ?? '0');
  });
  await test.step('세 퀘스트의 「보상 받기」를 모두 누른다', async () => {
    const 퀘스트 = await 퀘스트창.열기(game);
    for (const 이름 of ['임프 30마리 처치', '던전 보스 처치', '상점에서 물건 구매']) {
      await 퀘스트.보상받기(await 퀘스트줄(퀘스트, 이름));
      await hud.알림뜸('보상 받음');
      await 알림사라질때까지(game, '보상 받음');
    }
    const 서버 = await verify('운영툴 캐릭터 골드가 500 늘었다', (await 서버골드가될때까지(admin, 나, 전골드 + 500)) - 전골드, 500);
    const 화면 = await verify('상단 바 골드가 500 늘었다', (await hud.골드값()) - 전골드, 500);
    await verify('세 퀘스트 보상을 모두 받으면 받기 전보다 골드가 500 는다', 서버 && 화면, true);
  });
  await test.step('세 퀘스트의 「보상 받기」를 모두 누르고 「/gm stat」 첫 줄을 읽는다', async () => {
    const 상태 = await GM상태(game);
    await verify('받기 전보다 「/gm stat」 경험치가 650 는다', Number(상태['경험치'] ?? '0') - 전경험치, 650);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 사기, 색이름, 퀘스트줄 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 퀘스트처음으로 } from './helpers/game-state.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-297',
  name: '보상을 받으면 버튼 자리에 초록 「받음」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['quest:상점에서 물건 구매', 'flow:골드-상점 구매', 'flow:골드-일일 퀘스트', 'item:체력 물약', 'shop:체력 물약', 'flow:골드-상점 구매'],
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
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
    await 퀘스트처음으로(game);
    const 퀘스트 = await 퀘스트창.열기(game);
    const 줄 = await 퀘스트줄(퀘스트, '상점에서 물건 구매');
    await verify('「상점에서 물건 구매」 진행이 「0/1」이다', await 퀘스트.줄진행(줄), '0/1', { blocker: true });
  });
  await test.step('체력 물약을 사고 「상점에서 물건 구매」 「보상 받기」를 누른다', async () => {
    await 사기(game, '체력 물약');
    const 퀘스트 = await 퀘스트창.열기(game);
    const 줄 = await 퀘스트줄(퀘스트, '상점에서 물건 구매');
    await 퀘스트.줄진행이될때까지(줄, '1/1');
    await 퀘스트.보상받기(줄);
    await hud.알림뜸('보상 받음');
    const 글 = await verify('버튼 자리에 「받음」이 보인다', await 퀘스트.받음글(줄), '받음');
    const 색 = await verify('「받음」 글자가 초록색이다', 색이름((await 퀘스트.받음원문(줄)) ?? ''), '초록');
    await verify('보상을 받으면 버튼 자리에 초록 「받음」이 보인다', 글 && 색, true);
  });
});

import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 메인메뉴화면 } from './pages/main-menu.page.js';
import { 인원수선택창 } from './pages/player-count.page.js';


const 번호색 = defineCase({
  tcId: 'CGP-FN-308',
  name: '나눔 플레이에서 1P 와 2P 의 색을 견주면 1P~4P 번호마다 주황 · 하늘 · 노랑 · 초록으로 색이 다르다',
  platforms: ['windows'],
  precondition: ['2인 판이다'],
  held: '보류 — 2인 판의 플레이어 색을 읽는 주소를 모른다',
  params: z.object({
    색칸: z.string().describe('플레이어 색을 읽는 칸 — 컴포넌트.칸'),
    일P주소: z.string().describe('1P 표시 오브젝트 주소'),
    이P주소: z.string().describe('2P 표시 오브젝트 주소'),
  }),
  expected: null,
});

const 이름표색 = defineCase({
  tcId: 'CGP-FN-309',
  name: '플레이어 이름표와 미니맵 점의 색을 견주면 같은 색이다',
  platforms: ['windows'],
  precondition: ['2인 판이다'],
  held: '보류 — 2인 판의 플레이어 색을 읽는 주소를 모른다',
  params: z.object({
    색칸: z.string().describe('색을 읽는 칸 — 컴포넌트.칸'),
    이름표주소: z.string().describe('1P 이름표 오브젝트 주소'),
    미니맵점주소: z.string().describe('1P 미니맵 점 오브젝트 주소'),
  }),
  expected: null,
});

const 바닥원색 = defineCase({
  tcId: 'CGP-FN-310',
  name: '식물 바닥 원의 색을 견주면 그 식물을 심은 주인의 색이다',
  platforms: ['windows'],
  precondition: ['2인 판에서 식물을 심었다'],
  held: '보류 — 2인 판의 플레이어 색을 읽는 주소를 모른다',
  params: z.object({
    색칸: z.string().describe('색을 읽는 칸 — 컴포넌트.칸'),
    바닥원주소: z.string().describe('1P 가 심은 식물의 바닥 원 오브젝트 주소'),
    이름표주소: z.string().describe('1P 이름표 오브젝트 주소'),
  }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-009',
  name: '나눔 플레이 색',
  platforms: ['windows'],
  precondition: ['메인 메뉴에 있다'],
  cases: [번호색, 이름표색, 바닥원색],
});

test(procedure, async ({ game }) => {
  await test.case(번호색, async ({ params }) => {
    await test.step('「인원수 선택」 창에서 「2P」로 두 자리를 참가시킨다', async () => {
      const 메뉴 = await 메인메뉴화면.열기(game);
      await 메뉴.빠른시작누르기();
      const 인원수 = await 인원수선택창.기다리기(game);
      await 인원수.누르기('2P');
      await verify('참가 창이 뜬다', await 인원수.참가창뜰때까지(), true, { blocker: true });
      await game.key('Q+E');
      await game.key('Pad.L+Pad.R');
    });
    await test.step('1P 와 2P 의 색을 견준다', async () => {
      const 일P = await game.get(params.일P주소, params.색칸);
      const 이P = await game.get(params.이P주소, params.색칸);
      await verify('나눔 플레이에서 1P 와 2P 의 색을 견주면 1P~4P 번호마다 주황 · 하늘 · 노랑 · 초록으로 색이 다르다', JSON.stringify(일P) !== JSON.stringify(이P), true);
    });
  });

  await test.case(이름표색, async ({ params }) => {
    await test.step('이름표와 미니맵 점의 색을 견준다', async () => {
      const 이름표 = await game.get(params.이름표주소, params.색칸);
      const 점 = await game.get(params.미니맵점주소, params.색칸);
      await verify('플레이어 이름표와 미니맵 점의 색을 견주면 같은 색이다', JSON.stringify(이름표), JSON.stringify(점));
    });
  });

  await test.case(바닥원색, async ({ params }) => {
    await test.step('식물 바닥 원의 색을 견준다', async () => {
      await game.key('X');
      await game.key('X');
      const 원 = await game.get(params.바닥원주소, params.색칸);
      const 주인 = await game.get(params.이름표주소, params.색칸);
      await verify('식물 바닥 원의 색을 견주면 그 식물을 심은 주인의 색이다', JSON.stringify(원), JSON.stringify(주인));
    });
  });
});

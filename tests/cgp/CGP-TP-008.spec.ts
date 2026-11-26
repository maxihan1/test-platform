import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 스테이지까지 } from './helpers/enter.helper.js';
import { 줍고심기 } from './helpers/stage.helper.js';
import { 결과창 } from './pages/ending.page.js';
import { 스테이지화면 } from './pages/stage.page.js';

const 심을자리: [number, number][] = [[24.9, 27.1], [34, 34.6], [17.5, 27.1], [7.8, 31.5], [28.7, 35.5], [12.6, 35.9]];

const 승리 = defineCase({
  tcId: 'CGP-FN-292',
  name: '마지막 웨이브까지 세계수를 지키며 악마를 모두 물리치면 승리한다',
  platforms: ['windows'],
  precondition: ['첫 맵 마지막 웨이브다'],
  held: '보류 — 첫 맵을 이긴 작전이 없다',
  params: null,
  expected: null,
});

const 보스출현 = defineCase({
  tcId: 'CGP-FN-294',
  name: '마지막 웨이브가 되면 보스 악마가 나온다',
  platforms: ['windows'],
  precondition: ['첫 맵 마지막 웨이브다'],
  held: '보류 — 첫 맵을 이긴 작전이 없다',
  params: z.object({ 보스주소: z.string().describe('보스 악마 오브젝트 주소') }),
  expected: null,
});

const 보스폭탄 = defineCase({
  tcId: 'CGP-FN-298',
  name: '보스에게 폭탄을 던지면 보스는 기절하지 않는다',
  platforms: ['windows'],
  precondition: ['보스가 나와 있다'],
  held: '보류 — 첫 맵을 이긴 작전이 없다',
  params: z.object({
    보스주소: z.string().describe('보스 악마 오브젝트 주소'),
    기절칸: z.string().describe('보스 기절 상태 칸 — 컴포넌트.칸'),
  }),
  expected: null,
});

const 마법기절 = defineCase({
  tcId: 'CGP-FN-303',
  name: '보스 마법을 맞으면 식물이 잠시 기절한다',
  platforms: ['windows'],
  precondition: ['보스가 마법을 쓴다'],
  held: '보류 — 첫 맵을 이긴 작전이 없다',
  params: null,
  expected: null,
});

const 마법대상 = defineCase({
  tcId: 'CGP-FN-304',
  name: '보스 마법을 여러 번 보면 맞는 식물이 정해져 있지 않다',
  platforms: ['windows'],
  precondition: ['보스가 마법을 쓴다'],
  held: '보류 — 첫 맵을 이긴 작전이 없다',
  params: null,
  expected: null,
});

const 중간보스점수 = defineCase({
  tcId: 'CGP-FN-311',
  name: '중간 보스를 잡으면 5점이다',
  platforms: ['windows'],
  precondition: ['중간 보스가 나와 있다'],
  held: '보류 — 첫 맵을 이긴 작전이 없다',
  params: null,
  expected: null,
});

const 보스점수 = defineCase({
  tcId: 'CGP-FN-312',
  name: '보스를 잡으면 10점이다',
  platforms: ['windows'],
  precondition: ['보스가 나와 있다'],
  held: '보류 — 첫 맵을 이긴 작전이 없다',
  params: null,
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-008',
  name: '첫 맵 끝까지 — 보스와 승리',
  platforms: ['windows'],
  precondition: ['첫 맵을 1P 로 시작했다'],
  cases: [승리, 보스출현, 보스폭탄, 마법기절, 마법대상, 중간보스점수, 보스점수],
});

test(procedure, async ({ game }) => {
  let 스테이지!: 스테이지화면;
  const 기절본식물: string[] = [];

  await test.case(승리, async () => {
    await test.step('첫 맵 스테이지로 들어간다', async () => {
      스테이지 = await 스테이지까지(game);
      await verify('스테이지가 열려 있다', await 스테이지.보이나(스테이지화면.세계수), true, { blocker: true });
    });
    await test.step('마지막 웨이브 악마를 모두 물리친다', async () => {
      await 줍고심기(game, 심을자리, 400);
      const 결과 = await 결과창.넘기기(game);
      await verify('마지막 웨이브까지 세계수를 지키며 악마를 모두 물리치면 승리한다', 결과 === null ? '' : await 결과.승패글(), '승 리');
    });
  });

  await test.case(보스출현, async ({ params }) => {
    await test.step('마지막 웨이브에 나온 악마를 본다', async () => {
      await verify('마지막 웨이브가 되면 보스 악마가 나온다', await 스테이지.보이나(params.보스주소), true);
    });
  });

  await test.case(보스폭탄, async ({ params }) => {
    await test.step('보스에게 폭탄을 던진다', async () => {
      await game.key('Q');
      await verify('보스에게 폭탄을 던지면 보스는 기절하지 않는다', await game.get(params.보스주소, params.기절칸), false);
    });
  });

  await test.case(마법기절, async () => {
    await test.step('보스 마법을 맞은 식물을 본다', async () => {
      const 식물들 = await 스테이지.식물들();
      for (const 식물 of 식물들) if ((await game.get(식물, 'PlantAI.m_IsStunMarked')) === true) 기절본식물.push(식물);
      await verify('보스 마법을 맞으면 식물이 잠시 기절한다', 기절본식물.length > 0, true);
    });
  });

  await test.case(마법대상, async () => {
    await test.step('보스 마법이 맞는 식물을 여러 번 본다', async () => {
      await verify('보스 마법을 여러 번 보면 맞는 식물이 정해져 있지 않다', new Set(기절본식물).size > 1, true);
    });
  });

  await test.case(중간보스점수, async () => {
    await test.step('중간 보스를 잡는다', async () => {
      const 결과 = await 결과창.넘기기(game);
      await verify('중간 보스를 잡으면 5점이다', 결과 === null ? -1 : await 결과.점수('중간보스'), 5);
    });
  });

  await test.case(보스점수, async () => {
    await test.step('보스를 잡는다', async () => {
      const 결과 = await 결과창.넘기기(game);
      await verify('보스를 잡으면 10점이다', 결과 === null ? -1 : await 결과.점수('보스'), 10);
    });
  });
});

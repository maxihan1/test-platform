import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 스테이지까지 } from './helpers/enter.helper.js';
import { 스테이지화면 } from './pages/stage.page.js';


const 악마기절 = defineCase({
  tcId: 'CGP-FN-296',
  name: '악마에게 폭탄을 던지면 악마가 기절한다',
  platforms: ['windows'],
  precondition: ['첫 맵 스테이지에서 악마가 다가온다'],
  held: '보류 — 기절 상태를 읽는 주소를 모른다',
  params: z.object({
    악마주소: z.string().describe('폭탄을 맞힐 악마 오브젝트 주소'),
    기절칸: z.string().describe('악마 기절 상태 칸 — 컴포넌트.칸'),
  }),
  expected: null,
});

const 추가피해 = defineCase({
  tcId: 'CGP-FN-297',
  name: '기절한 악마를 공격하면 추가 피해를 받는다',
  platforms: ['windows'],
  precondition: ['악마가 기절해 있다'],
  held: '보류 — 기절 상태를 읽는 주소를 모른다',
  params: z.object({
    악마주소: z.string().describe('공격할 악마 오브젝트 주소'),
    체력칸: z.string().describe('악마 체력 칸 — 컴포넌트.칸'),
    보통피해: z.number().describe('기절하지 않은 악마가 공격 한 번에 받는 피해'),
  }),
  expected: null,
});

const 고양이기절 = defineCase({
  tcId: 'CGP-FN-299',
  name: '고양이 곁에 폭탄을 던지면 고양이도 기절한다',
  platforms: ['windows'],
  precondition: ['고양이 곁에서 폭탄이 터진다'],
  held: '보류 — 기절 상태를 읽는 주소를 모른다',
  params: z.object({
    고양이기절칸: z.string().describe('고양이 기절 상태 칸 — 컴포넌트.칸'),
  }),
  expected: null,
});

const 기절고기 = defineCase({
  tcId: 'CGP-FN-300',
  name: '고양이가 폭탄에 기절하면 고기 일부를 떨어뜨린다',
  platforms: ['windows'],
  precondition: ['고양이가 고기를 들고 있다'],
  held: '보류 — 기절 상태를 읽는 주소를 모른다',
  params: null,
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-007',
  name: '폭탄 기절',
  platforms: ['windows'],
  precondition: ['첫 맵을 1P 로 시작했다'],
  cases: [악마기절, 추가피해, 고양이기절, 기절고기],
});

test(procedure, async ({ game }) => {
  let 스테이지!: 스테이지화면;

  await test.case(악마기절, async ({ params }) => {
    await test.step('첫 맵 스테이지로 들어가 1웨이브 악마를 기다린다', async () => {
      스테이지 = await 스테이지까지(game);
      await verify('1웨이브 악마가 나와 있다', await 스테이지.남은악마될때까지('30', 30_000), true, { blocker: true });
    });
    await test.step('악마에게 폭탄을 던진다', async () => {
      await game.key('Q');
      await verify('악마에게 폭탄을 던지면 악마가 기절한다', await game.get(params.악마주소, params.기절칸), true);
    });
  });

  await test.case(추가피해, async ({ params }) => {
    await test.step('기절한 악마를 공격한다', async () => {
      const 앞 = Number(await game.get(params.악마주소, params.체력칸));
      await game.key('Z');
      const 뒤 = Number(await game.get(params.악마주소, params.체력칸));
      await verify('기절한 악마를 공격하면 추가 피해를 받는다', 앞 - 뒤 > params.보통피해, true);
    });
  });

  await test.case(고양이기절, async ({ params }) => {
    await test.step('고양이 곁에 폭탄을 던진다', async () => {
      await game.key('Q');
      await verify('고양이 곁에 폭탄을 던지면 고양이도 기절한다', await game.get(스테이지화면.고양이, params.고양이기절칸), true);
    });
  });

  await test.case(기절고기, async () => {
    await test.step('고양이가 폭탄에 기절한다', async () => {
      const 앞 = await 스테이지.고기수();
      await game.key('Q');
      const 뒤 = await 스테이지.고기바뀔때까지(앞, 5_000);
      await verify('고양이가 폭탄에 기절하면 고기 일부를 떨어뜨린다', 뒤 < 앞 && 뒤 > 0, true);
    });
  });
});

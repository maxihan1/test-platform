import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 살아있는스테이지, 식물이있는판, 첫식물주소 } from './helpers/stage-flow.helper.js';
import { 스테이지까지 } from './helpers/enter.helper.js';
import { 스테이지화면 } from './pages/stage.page.js';

const 심을자리: [number, number][] = [
  [18.2, 27.0],
  [13.8, 31.4],
  [22.9, 32.1],
  [24.9, 27.1],
  [28.7, 35.5],
  [8.5, 27],
];

const 빈자리회수 = defineCase({
  tcId: 'CGP-FN-058',
  name: '근처에 식물이 없는 자리에서 F 를 누르면 고기가 그대로다',
  platforms: ['windows'],
  precondition: ['첫 맵 스테이지에 있고 근처에 식물이 없다'],
  params: null,
  expected: null,
});

const 고기없이먹이기 = defineCase({
  tcId: 'CGP-FN-079',
  name: '고기가 0 인 채 식물 곁에서 C 를 누르면 그 식물의 먹인 고기가 그대로다',
  platforms: ['windows'],
  precondition: ['식물 넷을 심어 고기가 0 이다'],
  params: null,
  expected: null,
});

const 식물회수 = defineCase({
  tcId: 'CGP-FN-061',
  name: '식물 곁에서 F 를 눌러 회수하면 식물이 사라지고 사용한 고기보다 적게 고기가 는다',
  platforms: ['windows'],
  precondition: ['식물이 심겨 있다'],
  params: null,
  expected: null,
});

const 공격방식 = defineCase({
  tcId: 'CGP-FN-305',
  name: '식물 다섯을 심으면 식물 표의 공격 방식대로 악마를 공격한다',
  platforms: ['windows'],
  precondition: ['식물이 심겨 있다'],
  held: '보류 — 식물마다 공격 방식을 가를 값을 읽는 주소를 모른다',
  params: z.object({
    공격칸: z.string().describe('식물의 공격 방식을 읽는 칸 — 컴포넌트.칸'),
    기대공격: z.string().describe('식물 표의 공격 방식 — 심은 식물 차례대로 · 로 이은 글'),
  }),
  expected: null,
});

const 특기 = defineCase({
  tcId: 'CGP-FN-306',
  name: '식물 다섯을 심으면 식물 표의 특기대로 동작한다',
  platforms: ['windows'],
  precondition: ['식물이 심겨 있다'],
  held: '보류 — 식물마다 특기를 가를 값을 읽는 주소를 모른다',
  params: z.object({
    특기칸: z.string().describe('식물의 특기를 읽는 칸 — 컴포넌트.칸'),
    기대특기: z.string().describe('식물 표의 특기 — 심은 식물 차례대로 · 로 이은 글'),
  }),
  expected: null,
});

const 성장효과 = defineCase({
  tcId: 'CGP-FN-307',
  name: '식물 다섯을 키우면 식물 표의 성장 효과대로 세진다',
  platforms: ['windows'],
  precondition: ['식물이 심겨 있다'],
  held: '보류 — 식물마다 성장 효과를 가를 값을 읽는 주소를 모른다',
  params: z.object({
    성장칸: z.string().describe('식물의 성장 효과를 읽는 칸 — 컴포넌트.칸'),
    기대성장: z.string().describe('식물 표의 성장 효과 — 키운 식물 차례대로 · 로 이은 글'),
  }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-006',
  name: '식물 여럿 — 빈 자리 회수부터 식물 회수까지',
  platforms: ['windows'],
  precondition: [],
  cases: [빈자리회수, 고기없이먹이기, 식물회수, 공격방식, 특기, 성장효과],
});

test(procedure, async ({ game }) => {
  let 스테이지!: 스테이지화면;
  let 식물 = '';

  await test.case(빈자리회수, async () => {
    await test.step('메인 메뉴에서 첫 맵 스테이지로 들어가 심은 식물을 센다', async () => {
      스테이지 = await 스테이지까지(game);
      await verify('스테이지에 식물이 하나도 없다', await 스테이지.식물수(), 0, { blocker: true });
    });
    await test.step('식물이 없는 자리에서 F 를 누른다', async () => {
      const 앞 = await 스테이지.고기수();
      await 스테이지.회수누르기();
      await verify('근처에 식물이 없는 자리에서 F 를 누르면 고기가 그대로다', await 스테이지.고기바뀔때까지(앞, 3_000), 앞);
    });
  });

  await test.case(고기없이먹이기, async () => {
    await test.step('스테이지에서 서로 떨어진 자리 넷에 식물을 심는다', async () => {
      스테이지 = await 살아있는스테이지(game);
      for (const 자리 of 심을자리) if ((await 스테이지.고기수()) >= 5) await 스테이지.자리에심기(자리);
      await verify('고기가 0이다', await 스테이지.고기바뀔때까지(5, 3_000), 0);
    });
    await test.step('고기가 0 인 채 식물 곁에서 C 를 누른다', async () => {
      식물 = await 첫식물주소(스테이지);
      await 스테이지.식물곁에서기(식물);
      const 앞 = await 스테이지.먹인고기(식물);
      await 스테이지.먹이기(1);
      await verify('고기가 0 인 채 식물 곁에서 C 를 누르면 그 식물의 먹인 고기가 그대로다', await 스테이지.먹인고기(식물), 앞);
    });
  });

  await test.case(식물회수, async () => {
    await test.step('스테이지에서 심은 식물이 남아 있게 맞춘다', async () => {
      ({ 스테이지, 식물 } = await 식물이있는판(game));
    });
    await test.step('식물 곁에서 F 를 눌러 회수한다', async () => {
      await 스테이지.식물곁에서기(식물);
      const 앞식물 = await 스테이지.식물수();
      const 쓴고기 = 5 + (await 스테이지.먹인고기(식물));
      const 앞고기 = await 스테이지.고기수();
      await 스테이지.회수누르기();
      const 뒤식물 = await 스테이지.식물수될때까지(앞식물 - 1, 3_000);
      const 뒤고기 = await 스테이지.고기바뀔때까지(앞고기, 3_000);
      const 줄어듦 = await verify('식물이 하나 줄어든다', 앞식물 - 뒤식물, 1);
      const 늘어남 = await verify('고기가 는다', 뒤고기 > 앞고기, true);
      const 적게 = await verify('는 고기가 심고 먹이며 쓴 고기보다 적다', 뒤고기 - 앞고기 < 쓴고기, true);
      await verify('식물 곁에서 F 를 눌러 회수하면 식물이 사라지고 사용한 고기보다 적게 고기가 는다', 줄어듦 && 늘어남 && 적게, true);
    });
  });

  await test.case(공격방식, async ({ params }) => {
    await test.step('스테이지에서 심은 식물이 남아 있는 판을 이어 받는다', async () => {
      ({ 스테이지 } = await 식물이있는판(game));
    });
    await test.step('식물 다섯의 공격을 본다', async () => {
      const 값들: string[] = [];
      for (const 주소 of await 스테이지.식물들()) 값들.push(String(await game.get(주소, params.공격칸)));
      await verify('식물 다섯을 심으면 식물 표의 공격 방식대로 악마를 공격한다', 값들.join(' · '), params.기대공격);
    });
  });

  await test.case(특기, async ({ params }) => {
    await test.step('스테이지에서 식물이 심겨 있는 판을 확인한다', async () => {
      ({ 스테이지 } = await 식물이있는판(game));
    });
    await test.step('식물 다섯의 특기를 본다', async () => {
      const 값들: string[] = [];
      for (const 주소 of await 스테이지.식물들()) 값들.push(String(await game.get(주소, params.특기칸)));
      await verify('식물 다섯을 심으면 식물 표의 특기대로 동작한다', 값들.join(' · '), params.기대특기);
    });
  });

  await test.case(성장효과, async ({ params }) => {
    await test.step('스테이지에서 키울 식물이 심겨 있는 판을 확인한다', async () => {
      ({ 스테이지 } = await 식물이있는판(game));
    });
    await test.step('식물 다섯을 키우며 공격을 본다', async () => {
      const 값들: string[] = [];
      for (const 주소 of await 스테이지.식물들()) {
        await 스테이지.식물곁에서기(주소);
        await 스테이지.먹이기(1);
        값들.push(String(await game.get(주소, params.성장칸)));
      }
      await verify('식물 다섯을 키우면 식물 표의 성장 효과대로 세진다', 값들.join(' · '), params.기대성장);
    });
  });
});

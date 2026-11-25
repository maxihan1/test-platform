import { defineCase, repeatUntil, test, verify } from '@platform/kit';

import { 스테이지까지 } from './helpers/enter.helper.js';
import { 막기조각, 웨이브번호 } from './helpers/play.helper.js';
import { 스테이지화면 } from './pages/stage.page.js';

export const spec = defineCase({
  tcId: 'CGP-GS-003',
  name: '1웨이브 악마를 다 처치하면 웨이브 칸이 2/6 으로 바뀐다',
  platforms: ['windows'],
  precondition: ['첫 맵 1P 스테이지 · 고기 20'],
  held: '보류 — 1웨이브를 넘긴 작전이 없다',
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  let 스테이지!: 스테이지화면;

  await test.step('첫 맵 스테이지에 들어간다', async () => {
    스테이지 = await 스테이지까지(game);
    await verify('고기가 20이다', await 스테이지.고기수(), 20, { blocker: true });
  });

  await test.step('식물을 심고 고기를 주워 더 심으며 Z 로 악마를 친다', async () => {
    let 웨이브글 = '';
    let 멈춤: unknown;
    try {
      await repeatUntil(() => 막기조각(game, 10), {
        progress: async () => {
          if (await 스테이지.판끝났나()) throw new Error('1웨이브를 넘기기 전에 세계수가 무너졌다');
          웨이브글 = await 스테이지.웨이브글();
          return await 웨이브번호(game);
        },
        goal: 2,
        stallMs: 150_000,
      });
    } catch (e) {
      멈춤 = e;
    }
    await verify('1웨이브 악마를 다 처치하면 웨이브 칸이 2/6 으로 바뀐다', 웨이브글, '2/6');
    if (멈춤 !== undefined) throw 멈춤;
  });
});

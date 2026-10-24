import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 결과고정비우기, 바닥아이템남기기, 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 바닥아이템사라질때까지, 칸값읽기, GM으로초록들판가기 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-672',
  name: '봇은 15m 안의 바닥 아이템을 주우러 간다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  held: '보류 — 봇 행동을 읽을 게임 속성 주소를 모름',
  params: z.object({
    봇주소: z.string().describe('초록 들판 봇 오브젝트 주소'),
    위치칸: z.string().describe('봇의 위치를 담은 칸 — 컴포넌트.칸 꼴'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, request, params }) => {
  let 누구: 캐릭터 | undefined;
  let 떨군: 캐릭터 | undefined;
  try {
    await 결과고정비우기(admin);
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn672');
    });
    await test.step('새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있는지 확인한다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('봇 곁 10m 에 바닥 아이템을 떨어뜨린다', async () => {
      await GM으로초록들판가기(game);
      const 위치 = (await 칸값읽기(game, params.봇주소, params.위치칸)) as number[];
      const 남김 = await 바닥아이템남기기(admin, 'qafn672', { x: (위치[0] ?? 0) + 10, z: 위치[2] ?? 0 });
      떨군 = 남김.떨군;
      const 사라짐 = await 바닥아이템사라질때까지(request, 누구!, 'Beginner', 남김.아이템.id);
      await verify('봇은 15m 안의 바닥 아이템을 주우러 간다', 사라짐, true);
    });
  } finally {
    await 결과고정비우기(admin);
    if (떨군 !== undefined) await 캐릭터지우기(admin, 떨군);
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});

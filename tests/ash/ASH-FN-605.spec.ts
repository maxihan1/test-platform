import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 게임숫자 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-605',
  name: '월드의 몬스터마다 레벨 · HP · 공격력 · 방어력이 몬스터 표 값과 같다',
  platforms: ['android'],
  precondition: ['새 캐릭터로 월드에 들어가 있다'],
  held: '보류 — 게임 창을 못 엶(월드 몬스터)',
  elements: ['monster:Imp', 'monster:VandalImp', 'monster:ImpBoss'],
  params: z.object({
    임프: z.string().describe('임프 오브젝트 주소 — 게임 화면에서 읽는다'),
    반달임프: z.string().describe('반달 임프 오브젝트 주소 — 게임 화면에서 읽는다'),
    임프군주: z.string().describe('임프 군주 오브젝트 주소 — 게임 화면에서 읽는다'),
    레벨칸: z.string().describe('몬스터 레벨 칸 — 게임 화면에서 읽는다 (컴포넌트.칸 꼴)'),
    체력칸: z.string().describe('몬스터 HP 칸 — 게임 화면에서 읽는다 (컴포넌트.칸 꼴)'),
    공격력칸: z.string().describe('몬스터 공격력 칸 — 게임 화면에서 읽는다 (컴포넌트.칸 꼴)'),
    방어력칸: z.string().describe('몬스터 방어력 칸 — 게임 화면에서 읽는다 (컴포넌트.칸 꼴)'),
  }),
  expected: null,
});

test(spec, async ({ admin, game, params }) => {
  let 나: 캐릭터 | undefined;
  const 읽기 = async (주소: string): Promise<string> =>
    `레벨 ${String(await 게임숫자(game, 주소, params.레벨칸))} · HP ${String(await 게임숫자(game, 주소, params.체력칸))} · 공격력 ${String(await 게임숫자(game, 주소, params.공격력칸))} · 방어력 ${String(await 게임숫자(game, 주소, params.방어력칸))}`;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa605');
    });

    await test.step('월드에 임프 · 반달 임프 · 임프 군주가 있는지 확인한다', async () => {
      const 임프 = await verify('월드에 임프가 있다', (await game.find(params.임프)) !== null, true, { blocker: true });
      const 반달 = await verify('월드에 반달 임프가 있다', (await game.find(params.반달임프)) !== null, true, { blocker: true });
      const 군주 = await verify('월드에 임프 군주가 있다', (await game.find(params.임프군주)) !== null, true, { blocker: true });
      await verify('새 캐릭터로 월드에 들어가 몬스터가 있다', 임프 && 반달 && 군주, true, { blocker: true });
    });

    await test.step('몬스터마다 레벨 · HP · 공격력 · 방어력을 읽는다', async () => {
      const 임프맞음 = await verify.element('임프의 레벨 · HP · 공격력 · 방어력이 몬스터 표 값과 같다', 'monster:Imp', await 읽기(params.임프), '레벨 3 · HP 60 · 공격력 8 · 방어력 2');
      const 반달맞음 = await verify.element('반달 임프의 레벨 · HP · 공격력 · 방어력이 몬스터 표 값과 같다', 'monster:VandalImp', await 읽기(params.반달임프), '레벨 10 · HP 220 · 공격력 22 · 방어력 8');
      const 군주맞음 = await verify.element('임프 군주의 레벨 · HP · 공격력 · 방어력이 몬스터 표 값과 같다', 'monster:ImpBoss', await 읽기(params.임프군주), '레벨 20 · HP 3000 · 공격력 60 · 방어력 20');
      await verify('월드의 몬스터마다 레벨 · HP · 공격력 · 방어력이 몬스터 표 값과 같다', 임프맞음 && 반달맞음 && 군주맞음, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});

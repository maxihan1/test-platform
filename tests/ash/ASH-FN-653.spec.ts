import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 칸값읽기, GM으로초록들판가기 } from './helpers/world.helper.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-653',
  name: '스킬 1 · 스킬 2 를 쓰면 몬스터가 입는 데미지가 직업 표의 배율대로다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  held: '보류 — 데미지 값을 읽을 게임 속성 주소를 모름',
  elements: ['class:Warrior', 'monster:Imp'],
  params: z.object({
    몬스터주소: z.string().describe('몬스터가 입은 데미지를 읽을 게임 오브젝트 주소'),
    데미지칸: z.string().describe('입은 데미지를 담은 칸 — 컴포넌트.칸 꼴'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, request, params }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn653');
    });
    await test.step('새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있는지 확인한다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('스킬 1 · 스킬 2 를 몬스터에게 쓴다', async () => {
      const 공격력 = (await 캐릭터정보받기(request, 누구!)).stats.attack;
      await GM으로초록들판가기(game);
      const 월드 = new 월드화면(game);
      await 월드.누르기('Skill1Button');
      const 강타 = Number(await 칸값읽기(game, params.몬스터주소, params.데미지칸));
      await 월드.누르기('Skill2Button');
      const 대지 = Number(await 칸값읽기(game, params.몬스터주소, params.데미지칸));
      const 기본 = Math.max(1, 공격력 - 2 / 2);
      const 첫째 = await verify('스킬 1 데미지가 강타 배율 2 의 0.9~1.1 배 안이다', 강타 >= 기본 * 2 * 0.9 && 강타 <= 기본 * 2 * 1.1, true);
      const 둘째 = await verify('스킬 2 데미지가 대지 가르기 배율 1.2 의 0.9~1.1 배 안이다', 대지 >= 기본 * 1.2 * 0.9 && 대지 <= 기본 * 1.2 * 1.1, true);
      await verify('스킬 1 · 스킬 2 를 쓰면 몬스터가 입는 데미지가 직업 표의 배율대로다', 첫째 && 둘째, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});

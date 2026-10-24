import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 값이바뀔때까지, 값이작아질때까지, GM으로초록들판가기 } from './helpers/world.helper.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-654',
  name: '마법사가 「회복」을 쓰면 HP 가 최대 HP 의 35% 만큼 오른다',
  platforms: ['android'],
  precondition: ['새 마법사 캐릭터로 게임에 들어와 HP 가 줄어 있다'],
  held: '보류 — HP 를 줄여 둘 길과 회복량을 읽을 게임 속성 주소를 모름',
  elements: ['class:Mage'],
  params: z.object({
    HP오브젝트: z.string().describe('캐릭터의 HP 를 읽을 게임 오브젝트 주소'),
    HP칸: z.string().describe('현재 HP 를 담은 칸 — 컴포넌트.칸 꼴'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, request, params }) => {
  let 누구: 캐릭터 | undefined;
  let 최대HP = 0;
  let 줄어든HP = 0;
  try {
    await test.step('새 마법사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn654', 'Mage');
    });
    await test.step('새 마법사 캐릭터로 게임에 들어와 HP 가 줄어 있는지 확인한다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
      최대HP = (await 캐릭터정보받기(request, 누구!)).stats.maxHp;
      await GM으로초록들판가기(game);
      줄어든HP = await 값이작아질때까지(game, params.HP오브젝트, params.HP칸, 최대HP * 0.65);
      await verify('캐릭터의 HP 가 최대 HP 의 65% 아래로 줄어 있다', 줄어든HP < 최대HP * 0.65, true, { blocker: true });
    });
    await test.step('스킬 2 「회복」을 쓴다', async () => {
      await new 월드화면(game).누르기('Skill2Button');
      const 회복후 = Number(await 값이바뀔때까지(game, params.HP오브젝트, params.HP칸, 줄어든HP));
      await verify('마법사가 「회복」을 쓰면 HP 가 최대 HP 의 35% 만큼 오른다', Math.abs(회복후 - 줄어든HP - 최대HP * 0.35) <= 1, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});

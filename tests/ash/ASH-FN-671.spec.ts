import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 봇, type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 빨간봇만들기, 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 봇고르기, 위치표본모으기 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-671',
  name: '빨간 이름 봇은 마을에 들어가지 않는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  held: '보류 — 봇 위치를 오래 지켜볼 길이 없다(케이스 한도 120초)',
  elements: ['state:성향=악명', 'zone:Town'],
  params: z.object({
    봇주소: z.string().describe('빨간 이름 봇 오브젝트 주소'),
    위치칸: z.string().describe('봇의 위치를 담은 칸 — 컴포넌트.칸 꼴'),
    지켜볼초: z.number().int().describe('빨간 이름 봇을 지켜볼 시간(초) — 케이스 한도 120초 안'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  let 누구: 캐릭터 | undefined;
  let 빨강: 봇 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만들고 빨간 이름 봇을 마련한다', async () => {
      누구 = await 새캐릭터(admin, 'qafn671');
      빨강 = await 빨간봇만들기(admin, 누구, await 봇고르기(admin, 누구, 'Beginner', 'Innocent'));
      await 순간이동(admin, 누구, 'Town');
    });
    await test.step('새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있는지 확인한다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
      await verify('빨간 이름 봇이 있다', 빨강!.alignment.state, 'Chaotic', { blocker: true });
    });
    await test.step('빨간 이름 봇을 지켜본다', async () => {
      const 표본 = await 위치표본모으기(game, params.봇주소, params.위치칸, params.지켜볼초 * 1000);
      const 마을안 = 표본.filter((자리) => 자리.x >= 150 && 자리.x <= 250 && 자리.z >= 0 && 자리.z <= 80);
      await verify('빨간 이름 봇은 마을에 들어가지 않는다', 마을안.length, 0);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});

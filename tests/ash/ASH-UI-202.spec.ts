import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 새캐릭터, 순간이동, type 캐릭터 } from './helpers/game-state.helper.js';
import { 월드에들어가기 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-UI-202',
  name: '봇 머리 위에 「이름 Lv.N」 꼴 글자가 보인다',
  platforms: ['android'],
  precondition: ['새 캐릭터로 월드에 들어가 봇 가까이에 있다'],
  held: '보류 — 게임 창을 못 엶(월드 봇)',
  elements: ['zone:Beginner'],
  params: z.object({
    입장버튼: z.string().describe('월드 입장 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
    월드화면: z.string().describe('월드 화면 오브젝트 주소 — 게임 화면에서 읽는다'),
    봇이름표: z.string().describe('가까이 있는 봇 머리 위 글자 오브젝트 주소 — 게임 화면에서 읽는다'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터로 월드에 들어가 봇 가까이에 선다', async () => {
      나 = await 새캐릭터(admin, 'zqu202');
      await 순간이동(admin, 나, 'Beginner');
      await 월드에들어가기(game, 나, params.입장버튼, params.월드화면);
    });

    await test.step('월드에 들어가 봇 이름표가 보이는지 확인한다', async () => {
      await verify('월드 화면이 보인다', (await game.find(params.월드화면)) !== null, true, { blocker: true });
      await verify('봇 이름표가 보인다', (await game.find(params.봇이름표)) !== null, true, { blocker: true });
    });

    await test.step('봇 머리 위를 확인한다', async () => {
      const 글 = await game.text(params.봇이름표);
      await verify('봇 머리 위에 「이름 Lv.N」 꼴 글자가 보인다', /^\S.* Lv\.\d+$/.test(글), true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});

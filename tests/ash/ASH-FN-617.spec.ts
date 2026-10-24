import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 봇목록, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 월드에들어가기 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-617',
  name: '마을에 악명 봇이 보이지 않는다',
  platforms: ['android'],
  precondition: ['새 캐릭터로 월드에 들어가 마을에 있다'],
  held: '보류 — 게임 창을 못 엶(월드 봇)',
  elements: ['zone:Town', 'state:성향=악명', 'state:구역=마을'],
  params: z.object({
    입장버튼: z.string().describe('월드 입장 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
    월드화면: z.string().describe('월드 화면 오브젝트 주소 — 게임 화면에서 읽는다'),
    악명봇이름표: z.string().describe('마을에서 찾을 악명 봇 이름표 오브젝트 주소 — 게임 화면에서 읽는다'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터로 월드에 들어가 마을에 선다', async () => {
      나 = await 새캐릭터(admin, 'zqa617');
      await 순간이동(admin, 나, 'Town');
      await 월드에들어가기(game, 나, params.입장버튼, params.월드화면);
    });

    await test.step('월드에 들어가 마을에 있는지 확인한다', async () => {
      await verify('월드 화면이 보인다', (await game.find(params.월드화면)) !== null, true, { blocker: true });
      await verify('새 캐릭터가 마을에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Town', { blocker: true });
    });

    await test.step('마을의 악명 봇을 찾는다', async () => {
      const 화면 = await verify('마을 화면에 악명 봇 이름표가 보이지 않는다', await game.find(params.악명봇이름표), null);
      const 서버 = await verify(
        '마을에 있는 악명 봇이 없다',
        (await 봇목록(admin, 나!))
          .filter((b) => b.zone === 'Town' && b.alignment.state === 'Chaotic')
          .map((b) => b.name)
          .join(', '),
        '',
      );
      await verify('마을에 악명 봇이 보이지 않는다', 화면 && 서버, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});

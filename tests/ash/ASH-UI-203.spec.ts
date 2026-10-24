import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 봇선공만들기, 봇악명만들기, 산봇들, 새캐릭터, 순간이동, 월드다시두기, type 봇정보, type 캐릭터 } from './helpers/game-state.helper.js';
import { 봇찾기, 월드에들어가기 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-UI-203',
  name: '선량한 봇 이름이 파랑 · 선공 표시 봇이 보라 · 악명 봇이 빨강으로 보인다',
  platforms: ['android'],
  precondition: ['새 캐릭터로 월드에 들어가 봇 가까이에 있다'],
  held: '보류 — 게임 창을 못 엶(월드 봇)',
  elements: ['zone:Beginner', 'state:성향=선량', 'state:성향=보라', 'state:성향=악명'],
  params: z.object({
    입장버튼: z.string().describe('월드 입장 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
    월드화면: z.string().describe('월드 화면 오브젝트 주소 — 게임 화면에서 읽는다'),
    선량봇이름표: z.string().describe('선량한 봇 이름 글자 오브젝트 주소 — 게임 화면에서 읽는다'),
    선공봇이름표: z.string().describe('선공 표시 봇 이름 글자 오브젝트 주소 — 게임 화면에서 읽는다'),
    악명봇이름표: z.string().describe('악명 봇 이름 글자 오브젝트 주소 — 게임 화면에서 읽는다'),
    파랑: z.string().describe('파랑 이름 글자의 색 값 — 게임 화면에서 읽은 Text.color 를 JSON 글자로'),
    보라: z.string().describe('보라 이름 글자의 색 값 — 게임 화면에서 읽은 Text.color 를 JSON 글자로'),
    빨강: z.string().describe('빨강 이름 글자의 색 값 — 게임 화면에서 읽은 Text.color 를 JSON 글자로'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  let 나: 캐릭터 | undefined;
  let 선량: 봇정보 | undefined;
  let 선공: 봇정보 | undefined;
  let 악명: 봇정보 | undefined;
  try {
    await test.step('새 캐릭터로 월드에 들어가 선량한 봇 · 선공 표시 봇 · 악명 봇 가까이에 선다', async () => {
      나 = await 새캐릭터(admin, 'zqu203');
      await 순간이동(admin, 나, 'Beginner');
      let 후보 = await 산봇들(admin, 나, 'Beginner', 'Innocent');
      if (후보.length < 3) {
        await 월드다시두기(admin, 'Beginner');
        후보 = await 산봇들(admin, 나, 'Beginner', 'Innocent');
      }
      선량 = 후보[0];
      선공 = 후보[1];
      악명 = 후보[2];
      if (선량 === undefined || 선공 === undefined || 악명 === undefined) throw new Error('초록 들판에 살아 있는 선량한 봇이 셋 없다');
      await 봇악명만들기(admin, 'zqu203', 악명);
      await 월드에들어가기(game, 나, params.입장버튼, params.월드화면);
      await 봇선공만들기(admin, 나, 선공);
    });

    await test.step('월드와 봇 셋의 성향을 확인한다', async () => {
      await verify('월드 화면이 보인다', (await game.find(params.월드화면)) !== null, true, { blocker: true });
      await verify('선량한 봇이 있다', (await 봇찾기(admin, 나!, 선량!.id))?.alignment.state, 'Innocent', { blocker: true });
      await verify('선공 표시 봇이 있다', (await 봇찾기(admin, 나!, 선공!.id))?.alignment.state, 'Purple', { blocker: true });
      await verify('악명 봇이 있다', (await 봇찾기(admin, 나!, 악명!.id))?.alignment.state, 'Chaotic', { blocker: true });
    });

    await test.step('봇 이름 색을 확인한다', async () => {
      const 파란 = await verify('선량한 봇 이름이 파랑으로 보인다', JSON.stringify(await game.get(params.선량봇이름표, 'Text.color')), params.파랑);
      const 보랏빛 = await verify('선공 표시 봇 이름이 보라로 보인다', JSON.stringify(await game.get(params.선공봇이름표, 'Text.color')), params.보라);
      const 붉은 = await verify('악명 봇 이름이 빨강으로 보인다', JSON.stringify(await game.get(params.악명봇이름표, 'Text.color')), params.빨강);
      await verify('선량한 봇 이름이 파랑 · 선공 표시 봇이 보라 · 악명 봇이 빨강으로 보인다', 파란 && 보랏빛 && 붉은, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});

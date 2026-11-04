import { defineCase, test, verify } from '@platform/kit';

import { 기획서강화확률 } from './helpers/enhance.helper.js';
import { GM강화확률, GM설정, 값읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-400',
  name: 'GM 으로 강화 확률표를 바꾸면 GM 설정에 바꾼 값이 보인다',
  apiDoc: 2,
  precondition: ['로그인한 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 새 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('로그인한 캐릭터가 있는지 확인한다', async () => {
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  try {
    await test.step('GM 으로 목표 +10 강화 확률을 바꾼 뒤 GM 설정을 읽는다', async () => {
      await GM강화확률(request, 나, {
        rates: [{ targetLevel: 10, success: 0.3, fail: 0.4, destroy: 0.3 }],
      });
      const 설정 = await 값읽기<{
        enhance?: {
          rates?: {
            targetLevel: number;
            success: number;
            fail: number;
            destroy: number;
          }[];
        };
      }>(await GM설정(request, 나));
      const 줄 = 설정.enhance?.rates?.find((r) => r.targetLevel === 10);
      const 성공 = await verify('GM 설정의 목표 +10 성공 확률이 0.3 이다', 줄?.success, 0.3);
      const 실패 = await verify('GM 설정의 목표 +10 실패 확률이 0.4 이다', 줄?.fail, 0.4);
      const 파괴 = await verify('GM 설정의 목표 +10 파괴 확률이 0.3 이다', 줄?.destroy, 0.3);
      await verify('GM 으로 강화 확률표를 바꾸면 GM 설정에 바꾼 값이 보인다', 성공 && 실패 && 파괴, true);
    });
  } finally {
    await GM강화확률(request, 나, { rates: [기획서강화확률] });
  }
});

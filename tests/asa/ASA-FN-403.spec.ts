import { defineCase, test, verify } from '@platform/kit';

import { 기획서강화확률 } from './helpers/enhance.helper.js';
import { GM강화확률, GM설정, 값읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-403',
  name: '「reset」을 보내면 목표 +10 강화 확률이 성공 10% · 실패 50% · 파괴 40% 로 돌아온다',
  apiDoc: 1,
  precondition: ['GM 으로 목표 +10 강화 확률을 바꾼 캐릭터가 있다'],
  params: null,
  expected: null,
});

interface 설정응답 {
  enhance?: {
    rates?: {
      targetLevel: number;
      success: number;
      fail: number;
      destroy: number;
    }[];
  };
}

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  try {
    await test.step('일회용 계정으로 새 캐릭터를 만들고 GM 으로 목표 +10 강화 확률을 바꾼다', async () => {
      나 = await 플레이어만들기(request);
      await GM강화확률(request, 나, {
        rates: [{ targetLevel: 10, success: 0.3, fail: 0.4, destroy: 0.3 }],
      });
    });

    await test.step('목표 +10 강화 확률이 바뀐 캐릭터를 확인한다', async () => {
      const 설정 = await 값읽기<설정응답>(await GM설정(request, 나));
      const 줄 = 설정.enhance?.rates?.find((r) => r.targetLevel === 10);
      await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
        blocker: true,
      });
      await verify('목표 +10 성공 확률이 기획서 값에서 바뀌어 있다', 줄?.success !== 기획서강화확률.success, true, { blocker: true });
    });

    await test.step('GM 강화 확률표에 「reset」을 보낸다', async () => {
      await GM강화확률(request, 나, { reset: true });
      const 설정 = await 값읽기<설정응답>(await GM설정(request, 나));
      const 줄 = 설정.enhance?.rates?.find((r) => r.targetLevel === 10);
      const 성공 = await verify('목표 +10 성공 확률이 0.1 이다', 줄?.success, 0.1);
      const 실패 = await verify('목표 +10 실패 확률이 0.5 이다', 줄?.fail, 0.5);
      const 파괴 = await verify('목표 +10 파괴 확률이 0.4 이다', 줄?.destroy, 0.4);
      await verify('「reset」을 보내면 목표 +10 강화 확률이 성공 10% · 실패 50% · 파괴 40% 로 돌아온다', 성공 && 실패 && 파괴, true);
    });
  } finally {
    if (나 !== undefined) await GM강화확률(request, 나, { rates: [기획서강화확률] });
  }
});

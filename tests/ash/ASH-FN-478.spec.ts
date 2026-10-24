import { defineCase, test, verify } from '@platform/kit';

import { 강화확률되돌리기, 계정지우기, 새캐릭터, 캐릭터읽기, type 강화확률, type 캐릭터 } from './helpers/game-state.helper.js';
import { GM강화확률, GM설정 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-478',
  name: 'GM 강화 확률표를 바꾸면 설정에 바꾼 확률이 보인다',
  platforms: ['android'],
  precondition: ['로그인한 캐릭터가 있다', 'GM 강화 확률표를 바꾼 상태다'],
  elements: ['rate:enhance_4'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 기본: 강화확률[] = [];
  try {
    await test.step('로그인한 새 캐릭터를 만들고 강화 확률표를 기본 표로 되돌린다', async () => {
      나 = await 새캐릭터(admin, 'zqa478');
      await 강화확률되돌리기(admin);
    });

    await test.step('새 캐릭터가 있고 설정에 목표 +4 강화 확률 줄이 있는지 확인한다', async () => {
      await verify('새 캐릭터를 어드민에서 읽을 수 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
      기본 = (await GM설정(admin, 나!)).enhance.rates;
      await verify('설정에 목표 +4 강화 확률 줄이 있다', 기본.some((x) => x.targetLevel === 4), true, { blocker: true });
    });

    await test.step('GM 강화 확률표의 +4 줄을 바꾼다', async () => {
      const 바꾼표 = 기본.map((x) => (x.targetLevel === 4 ? { targetLevel: 4, success: 0.5, fail: 0.3, destroy: 0.2 } : x));
      const 응답 = await GM강화확률(admin, 나!, { rates: 바꾼표 });
      const 코드 = await verify('GM 강화 확률표 응답이 200 이다', 응답.status(), 200);
      const 줄 = (await GM설정(admin, 나!)).enhance.rates.find((x) => x.targetLevel === 4);
      const 확률 = await verify('설정의 목표 +4 성공 확률이 바꾼 확률이다', 줄?.success, 0.5);
      await verify('GM 강화 확률표를 바꾸면 설정에 바꾼 확률이 보인다', 코드 && 확률, true);
    });

    await test.step('GM 강화 확률표가 바뀐 상태인지 확인한다', async () => {
      const 줄 = (await GM설정(admin, 나!)).enhance.rates.find((x) => x.targetLevel === 4);
      await verify('설정의 목표 +4 성공 확률이 바뀌어 있다', 줄?.success, 0.5, { blocker: true });
    });

    await test.step('GM 강화 확률표를 reset 으로 되돌린다', async () => {
      const 응답 = await GM강화확률(admin, 나!, { reset: true });
      const 코드 = await verify('GM 강화 확률표 reset 응답이 200 이다', 응답.status(), 200);
      const 줄 = (await GM설정(admin, 나!)).enhance.rates.find((x) => x.targetLevel === 4);
      const 확률 = await verify('설정의 목표 +4 성공 확률이 70% 다', 줄?.success, 0.7);
      await verify('GM 강화 확률표를 reset 하면 +4 성공 확률이 70% 로 돌아온다', 코드 && 확률, true);
    });
  } finally {
    await 강화확률되돌리기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});

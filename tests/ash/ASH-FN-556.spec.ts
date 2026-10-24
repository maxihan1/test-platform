import { defineCase, test, verify } from '@platform/kit';

import { 강화확률되돌리기, 강화확률바꾸기, 어드민설정, type 강화확률 } from './helpers/game-state.helper.js';
import { 어드민열림 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-556',
  name: '어드민 강화 설정을 바꾸면 어드민 설정에 바꾼 확률이 보인다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  elements: ['rate:enhance_4'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 기본: 강화확률[] = [];
  try {
    await test.step('강화 확률표를 기본 표로 되돌린다', async () => {
      await 강화확률되돌리기(admin);
    });

    await test.step('어드민 키가 있고 설정에 목표 +4 강화 확률 줄이 있는지 확인한다', async () => {
      await verify('어드민 키로 어드민 계정 목록을 부르면 200 이다', await 어드민열림(admin), 200, { blocker: true });
      기본 = (await 어드민설정(admin)).enhance.rates;
      await verify('설정에 목표 +4 강화 확률 줄이 있다', 기본.some((x) => x.targetLevel === 4), true, { blocker: true });
    });

    await test.step('어드민 강화 설정의 +4 성공 확률을 바꾼다', async () => {
      await 강화확률바꾸기(
        admin,
        기본.map((x) => (x.targetLevel === 4 ? { targetLevel: 4, success: 0.5, fail: 0.3, destroy: 0.2 } : x)),
      );
      const 줄 = (await 어드민설정(admin)).enhance.rates.find((x) => x.targetLevel === 4);
      await verify('어드민 강화 설정을 바꾸면 어드민 설정에 바꾼 확률이 보인다', 줄?.success, 0.5);
    });
  } finally {
    await 강화확률되돌리기(admin);
  }
});

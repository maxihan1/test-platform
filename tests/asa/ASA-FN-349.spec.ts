import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇목록 } from './helpers/combat.helper.js';
import { 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-349',
  name: '봇 성향 비율이 평화형 40% · 반격형 40% · 선공형 20% 와 허용 오차 안에서 같다',
  apiDoc: 1,
  precondition: ['로그인한 캐릭터가 있다'],
  params: z.object({
    허용오차: z
      .number()
      .min(0.33)
      .max(0.99)
      .describe(
        '성향 비율이 기대와 벌어져도 괜찮은 폭 — 0.33 이상 0.99 이하, 기본값은 봇 20명 기준 3 × √(p(1−p)/N) 가운데 가장 큰 값을 0.01 단위로 올린 것',
      )
      .default(0.33),
  }),
  expected: null,
});

const 성향이름: Record<string, string> = {
  Peaceful: '평화형',
  Retaliate: '반격형',
  Aggressive: '선공형',
};

test(spec, async ({ request, params }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('캐릭터가 만들어졌는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('구역 없이 봇 목록을 불러 성향을 센다', async () => {
    const 봇들 = await 봇목록(request, 나);
    await verify('봇 목록에 봇이 있다', 봇들.length > 0, true, {
      blocker: true,
    });
    const 센값: Record<string, number> = { 평화형: 0, 반격형: 0, 선공형: 0 };
    for (const 봇 of 봇들) {
      const 이름 = 성향이름[봇.temperament] ?? 봇.temperament;
      센값[이름] = (센값[이름] ?? 0) + 1;
    }
    const 비율안 = await verify.rates(
      '평화형 · 반격형 · 선공형 봇 비율이 기대 확률과 허용 오차 안에서 같다',
      센값,
      { 평화형: 0.4, 반격형: 0.4, 선공형: 0.2 },
      params.허용오차,
    );
    await verify('봇 성향 비율이 평화형 40% · 반격형 40% · 선공형 20% 와 허용 오차 안에서 같다', 비율안, true);
  });
});

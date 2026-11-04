import { defineCase, test, verify } from '@platform/kit';

import { 재화원장 } from './helpers/combat.helper.js';
import { 값읽기, 가방읽기, 사기, 템플릿찾기, 팔기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-388',
  name: '재화 원장을 부르면 「createdAt」이 최신순이다',
  apiDoc: 2,
  precondition: ['상점에서 물약을 사고 판 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 산응답 = 0;
  let 판응답 = 0;

  await test.step('일회용 계정으로 캐릭터를 만들고 상점에서 물약을 사고 판다', async () => {
    나 = await 플레이어만들기(request);
    산응답 = (await 사기(request, 나, 'potion_hp_s', 1)).status();
    const 물약 = 템플릿찾기(await 가방읽기(request, 나), 'potion_hp_s');
    판응답 = (await 팔기(request, 나, 물약?.id ?? 0, 1)).status();
  });

  await test.step('상점에서 물약을 사고 판 캐릭터를 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('물약을 사는 요청 응답 코드가 200 이다', 산응답, 200, {
      blocker: true,
    });
    await verify('물약을 파는 요청 응답 코드가 200 이다', 판응답, 200, {
      blocker: true,
    });
  });

  await test.step('재화 원장을 부른다', async () => {
    const 줄들 = await 값읽기<{ createdAt: string }[]>(await 재화원장(request, 나));
    await verify('재화 원장에 줄이 셋 이상 있다', 줄들.length >= 3, true, {
      blocker: true,
    });
    const 시각들 = 줄들.map((줄) => Date.parse(줄.createdAt));
    await verify(
      '재화 원장을 부르면 「createdAt」이 최신순이다',
      시각들.every((시각, i) => i === 0 || 시각들[i - 1]! >= 시각),
      true,
    );
  });
});

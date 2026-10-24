import { defineCase, test, verify } from '@platform/kit';

import { 새캐릭터자리, 확률줄글, 확률퍼센트, GM설정읽기 } from './helpers/admin.helper.js';
import { 머리, type 캐릭터 } from './helpers/api.helper.js';
import { 강화확률되돌리기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-478',
  name: 'GM 으로 강화 확률을 바꾸면 설정의 그 줄이 바뀐다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: [
    'zone:Town',
    'rate:enhance_4',
    'rate:enhance_5',
    'rate:enhance_6',
    'rate:enhance_7',
    'rate:enhance_8',
    'rate:enhance_9',
    'rate:enhance_10',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn478');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('GM 으로 목표 +4 강화 확률을 바꾸고 설정을 받는다', async () => {
      const 나 = 누구!;
      await request.post('/gm/enhance-rate', { headers: 머리(나), data: { rates: [{ targetLevel: 4, success: 0.25, fail: 0.25, destroy: 0.5 }] } });
      const 설정 = await GM설정읽기(request, 나);
      await verify('GM 으로 강화 확률을 바꾸면 설정의 그 줄이 바뀐다', 확률줄글(설정.enhance, 4), '0.25 · 0.25 · 0.5');
    });
    await test.step('GM 으로 강화 확률을 reset 으로 되돌리고 설정을 받는다', async () => {
      const 나 = 누구!;
      await request.post('/gm/enhance-rate', { headers: 머리(나), data: { reset: true } });
      const 표 = (await GM설정읽기(request, 나)).enhance;
      const 넷 = await verify.element('강화 +4 확률이 기획서와 같다', 'rate:enhance_4', 확률퍼센트(표, 4), { 성공: 70, 실패: 20, 파괴: 10 });
      const 다섯 = await verify.element('강화 +5 확률이 기획서와 같다', 'rate:enhance_5', 확률퍼센트(표, 5), { 성공: 60, 실패: 25, 파괴: 15 });
      const 여섯 = await verify.element('강화 +6 확률이 기획서와 같다', 'rate:enhance_6', 확률퍼센트(표, 6), { 성공: 50, 실패: 30, 파괴: 20 });
      const 일곱 = await verify.element('강화 +7 확률이 기획서와 같다', 'rate:enhance_7', 확률퍼센트(표, 7), { 성공: 40, 실패: 35, 파괴: 25 });
      const 여덟 = await verify.element('강화 +8 확률이 기획서와 같다', 'rate:enhance_8', 확률퍼센트(표, 8), { 성공: 30, 실패: 40, 파괴: 30 });
      const 아홉 = await verify.element('강화 +9 확률이 기획서와 같다', 'rate:enhance_9', 확률퍼센트(표, 9), { 성공: 20, 실패: 45, 파괴: 35 });
      const 열 = await verify.element('강화 +10 확률이 기획서와 같다', 'rate:enhance_10', 확률퍼센트(표, 10), { 성공: 10, 실패: 50, 파괴: 40 });
      await verify('GM 강화 확률을 reset 하면 기본 표로 돌아간다', 넷 && 다섯 && 여섯 && 일곱 && 여덟 && 아홉 && 열, true);
    });
  } finally {
    await 강화확률되돌리기(admin);
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});

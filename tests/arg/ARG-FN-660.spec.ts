import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-660',
  name: '처음 로그인하고 「녹슨 단검」과 「가죽 갑옷」을 사면 처음 받은 200 골드로 「녹슨 단검」과 「가죽 갑옷」을 함께 살 수 있다(180 골드)',
  platforms: ['android'],
  precondition: ['캐릭터가 없는 계정이다'],
  params: null,
  expected: null,
  held: '보류 — 캐릭터 없는 신규 계정을 만드는 길 없음',
});

test(spec, async ({ game }) => {
  await test.step('처음 로그인하고 「녹슨 단검」과 「가죽 갑옷」을 산다', async () => {
    await 로그인화면까지(game);
    await verify('처음 로그인하고 「녹슨 단검」과 「가죽 갑옷」을 사면 처음 받은 200 골드로 「녹슨 단검」과 「가죽 갑옷」을 함께 살 수 있다(180 골드)', await 뜨는지(game, 화면글자('녹슨 단검')), true);
  });
});

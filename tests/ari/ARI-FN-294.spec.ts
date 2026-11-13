import { defineCase, test, verify } from '@platform/kit';

import { 입력칸이름들, 화면글들 } from './helpers/html.helper.js';
import { 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-294',
  name: '계정 만들기 화면을 열면 전화번호 입력 칸이 보이지 않는다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('GET /Account/Create 를 불러 입력 칸을 읽는다', async () => {
    const 화면 = await 화면글(request, '/Account/Create');
    await verify('계정 만들기 응답 코드가 200 이다', 화면.status, 200, { blocker: true });
    const 칸 = await verify('전화번호 입력 칸이 없다', 입력칸이름들(화면.html).filter((이름) => /phone/i.test(이름)).join(', '), '');
    const 글 = await verify('전화번호 글자가 없다', 화면글들(화면.html).filter((조각) => /phone|전화/i.test(조각)).join(', '), '');
    await verify('계정 만들기 화면을 열면 전화번호 입력 칸이 보이지 않는다', 칸 && 글, true);
  });
});

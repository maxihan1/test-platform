import { defineCase, test, verify } from '@platform/kit';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-UI-038',
  name: '백오피스에 「캐릭터」 탭이 열린 채로 보인다',
  precondition: ['키를 넣지 않았다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 백오피스화면(page);

  await test.step('백오피스를 연다', async () => {
    await 화면.열기();
    const 눌림 = await verify('「캐릭터」 탭 버튼이 눌린 표시로 보인다', ((await 화면.캐릭터탭.getAttribute('class')) ?? '').split(' ').includes('on'), true);
    const 칸 = await verify('「캐릭터 이름 일부」 칸이 보인다', await 화면.이름칸.isVisible(), true);
    await verify('백오피스에 「캐릭터」 탭이 열린 채로 보인다', 눌림 && 칸, true);
  });
});

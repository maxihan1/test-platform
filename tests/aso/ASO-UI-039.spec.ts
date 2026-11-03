import { defineCase, test, verify } from '@platform/kit';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-UI-039',
  name: '머리 버튼 반응',
  precondition: ['백오피스를 열었다', '다른 탭이 열려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 백오피스화면(page);

  await test.step('백오피스를 연다', async () => {
    await 화면.열기();
    await verify('「X-Admin-Key」 칸이 보인다', await 화면.키칸.isVisible(), true, { blocker: true });
  });

  await test.step('「확률·결과 고정」을 누른다', async () => {
    await 화면.확률탭.click();
    await verify('머리에서 「확률·결과 고정」을 누르면 「결과 고정 (다음 판정부터 차례로)」 카드가 보인다', await 화면.결과고정제목.isVisible(), true);
  });

  await test.step('「스폰」을 누른다', async () => {
    await 화면.스폰탭.click();
    await verify('머리에서 「스폰」을 누르면 「스폰 추가·수정」 카드가 보인다', await 화면.스폰추가제목.isVisible(), true);
  });

  await test.step('「정리」를 누른다', async () => {
    await 화면.정리탭.click();
    await verify('머리에서 「정리」를 누르면 「테스트 계정 삭제」 카드가 보인다', await 화면.계정삭제제목.isVisible(), true);
  });

  await test.step('「캐릭터」를 누른다', async () => {
    await 화면.캐릭터탭.click();
    await verify('머리에서 「캐릭터」를 누르면 「캐릭터 이름 일부」 칸이 보인다', await 화면.이름칸.isVisible(), true);
  });
});

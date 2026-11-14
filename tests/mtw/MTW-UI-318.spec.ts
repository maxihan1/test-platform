import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 정보화면 } from './pages/about.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-318',
  name: '정보 버튼 반응',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 정보화면(page);

  await test.step('정보 화면에서 「ALT」 배지를 누른다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await 화면.알트배지.click();
    const 떴다 = await 화면.창.창.first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('정보 화면에서 「ALT」 배지를 누르면 그림 설명 창이 뜬다', 떴다, true);
  });

  await test.step('정보 화면에서 「정보」 펼침 머리를 누른다', async () => {
    await 화면.열기();
    await 화면.머리누르기('정보');
    const 접혔다 = await 화면.구획본문('정보').waitFor({ state: 'detached', timeout: 10_000 }).then(() => true, () => false);
    await verify('정보 화면에서 「정보」 펼침 머리를 누르면 접힌다', 접혔다, true);
  });

  await test.step('정보 화면에서 「제한된 서버들」 펼침 머리를 누른다', async () => {
    await 화면.열기();
    await 화면.머리누르기('제한된 서버들');
    const 보인다 = await 화면.구획안내('제한된 서버들').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('정보 화면에서 「제한된 서버들」 펼침 머리를 누르면 펼쳐지고 「이 정보는 이 서버에서 사용할 수 없습니다.」가 보인다', 보인다, true);
  });
});

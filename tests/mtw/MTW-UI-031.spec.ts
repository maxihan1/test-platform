import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 정보화면 } from './pages/about.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-031',
  name: '정보 화면에서 펼침 머리를 누르면 펼쳐지고 다시 누르면 접힌다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 정보화면(page);

  await test.step('정보 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('정보 화면에 「서버 규칙」 펼침 머리가 보인다', await 화면.구획머리('서버 규칙').isVisible(), true, { blocker: true });
    await verify('「서버 규칙」은 처음에 접혀 있다', await 화면.구획본문('서버 규칙').isVisible(), false, { blocker: true });
  });

  await test.step('정보 화면에서 「서버 규칙」 펼침 머리를 두 번 누른다', async () => {
    await 화면.머리누르기('서버 규칙');
    const 펼쳐짐 = await 화면.구획본문('서버 규칙').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 펼침 = await verify('펼침 머리를 한 번 누르면 펼쳐진다', 펼쳐짐, true);
    await 화면.머리누르기('서버 규칙');
    const 접혀짐 = await 화면.구획본문('서버 규칙').waitFor({ state: 'detached', timeout: 10_000 }).then(() => true, () => false);
    const 접힘 = await verify('펼침 머리를 다시 누르면 접힌다', 접혀짐, true);
    await verify('정보 화면에서 펼침 머리를 누르면 펼쳐지고 다시 누르면 접힌다', 펼침 && 접힘, true);
  });
});

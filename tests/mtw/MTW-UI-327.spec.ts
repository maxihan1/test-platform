import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-327',
  name: '검색 결과 버튼 반응',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});
test(spec, async ({ page }) => {
  const 검색 = new 검색화면(page);

  await test.step('비회원으로 「hana」 검색 결과를 연다', async () => {
    await 한국어로(page);
    await 검색.열기('hana');
  });

  await test.step('검색 결과에서 「프로필」 탭을 누른다', async () => {
    await 검색.탭('프로필').click();
    const 떴다 = await 검색.결과줄('hana_photo').first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('검색 결과에서 「프로필」 탭을 누르면 찾은 프로필 줄이 보인다', 떴다, true);
  });

  await test.step('검색 결과에서 「해시태그」 탭을 누른다', async () => {
    await 검색.탭('해시태그').click();
    const 떴다 = await 검색.결과없음.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('검색 결과에서 「해시태그」 탭을 누르면 「결과가 없습니다.」가 보인다', 떴다, true);
  });

  await test.step('검색 결과 줄의 「팔로우」를 누른다', async () => {
    await 검색.탭('프로필').click();
    const 있다 = await 검색.결과줄팔로우('hana_photo').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    if (있다) await 검색.결과줄팔로우('hana_photo').click();
    const 떴다 = 있다 && (await 검색.안내창.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false));
    await verify('검색 결과 줄의 「팔로우」를 누르면 로그인 안내 창이 뜬다', 떴다, true);
  });

  await test.step('검색 결과 줄의 프로필 링크를 누른다', async () => {
    await 검색.안내창닫기();
    await 검색.탭('프로필').click();
    const 있다 = await 검색.결과줄('hana_photo').first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
    if (있다) await 검색.결과줄('hana_photo').first().click();
    const 갔다 = 있다 && (await 검색.프로필로갔나('hana_photo'));
    await verify('검색 결과 줄의 프로필 링크를 누르면 그 프로필 화면으로 간다', 갔다, true);
  });
});

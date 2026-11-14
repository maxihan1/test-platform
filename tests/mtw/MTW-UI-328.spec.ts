import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-328',
  name: '프로필 버튼 반응',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 프로필 = new 프로필화면(page);

  await test.step('프로필에서 「미디어」 탭을 누른다', async () => {
    await 한국어로(page);
    await 프로필.열기('hana_photo');
    await 프로필.탭('미디어').click();
    await 프로필.주소바뀔때까지(/\/media$/);
    await verify('프로필에서 「미디어」 탭을 누르면 /@아이디/media 로 간다', new URL(page.url()).pathname, '/@hana_photo/media');
  });

  await test.step('프로필에서 「추천」 탭을 누른다', async () => {
    await 프로필.열기('hana_photo');
    await 프로필.탭('추천').click();
    await 프로필.주소바뀔때까지(/\/featured$/);
    await verify('프로필에서 「추천」 탭을 누르면 /@아이디/featured 로 간다', new URL(page.url()).pathname, '/@hana_photo/featured');
  });

  await test.step('프로필에서 「게시물과 부스트」를 누른다', async () => {
    await 프로필.열기('hana_photo');
    await 프로필.게시물과부스트.click();
    const 답글 = await 프로필.체크상자('답글 보기').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 부스트 = await 프로필.체크상자('부스트 보기').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('프로필에서 「게시물과 부스트」를 누르면 「답글 보기」 · 「부스트 보기」 선택 목록이 뜬다', 답글 && 부스트, true);
  });

  await test.step('프로필에서 팔로워 숫자를 누른다', async () => {
    await 프로필.열기('hana_photo');
    await 프로필.통계링크('팔로워').click();
    await 프로필.주소바뀔때까지(/\/followers$/);
    await verify('프로필에서 팔로워 숫자를 누르면 /@아이디/followers 로 간다', new URL(page.url()).pathname, '/@hana_photo/followers');
  });

  await test.step('프로필에서 팔로잉 숫자를 누른다', async () => {
    await 프로필.열기('hana_photo');
    await 프로필.통계링크('팔로잉').click();
    await 프로필.주소바뀔때까지(/\/following$/);
    await verify('프로필에서 팔로잉 숫자를 누르면 /@아이디/following 으로 간다', new URL(page.url()).pathname, '/@hana_photo/following');
  });

  await test.step('프로필에서 가입 날짜를 누른다', async () => {
    await 프로필.열기('hana_photo');
    await 프로필.가입날짜버튼.click();
    const 떴다 = await 프로필.가입창.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('프로필에서 가입 날짜를 누르면 가입한 날 창이 뜬다', 떴다, true);
  });
});

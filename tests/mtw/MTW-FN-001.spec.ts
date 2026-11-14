import { defineCase, test, verify } from '@platform/kit';

import { 글경로 } from './helpers/api.helper.js';
import { 비회원글찾기API } from './helpers/status-api.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 정보화면 } from './pages/about.page.js';
import { 유행중화면 } from './pages/explore.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-001',
  name: '비회원으로 정보 · 유행 중 · 실시간 피드 · 공개 프로필 · 공개 글을 열면 로그인 화면으로 가지 않고 내용이 보인다',
  smoke: true,
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 정보 = new 정보화면(page);
  const 유행 = new 유행중화면(page);
  const 피드 = new 실시간피드화면(page);
  const 프로필 = new 프로필화면(page);
  const 상세 = new 글상세화면(page);
  const 로그인화면아님 = (): boolean => !new URL(page.url()).pathname.startsWith('/auth/sign_in');

  await test.step('비회원으로 정보 · 유행 중 · 실시간 피드 · hana_photo 프로필 · hana_photo 공개 글을 차례로 연다', async () => {
    await 한국어로(page);
    await 정보.열기();
    const 정보주소 = await verify('정보 화면이 로그인 화면으로 가지 않는다', 로그인화면아님(), true);
    const 정보내용 = await verify('정보 화면에 서버 이름이 보인다', await 정보.서버이름.isVisible(), true);

    await 유행.열기();
    const 유행주소 = await verify('유행 중 화면이 로그인 화면으로 가지 않는다', 로그인화면아님(), true);
    const 유행내용 = await verify('유행 중 화면에 「게시물」 탭이 보인다', await 유행.게시물탭.isVisible(), true);

    await 피드.열기();
    const 피드주소 = await verify('실시간 피드가 로그인 화면으로 가지 않는다', 로그인화면아님(), true);
    const 피드내용 = await verify('실시간 피드에 「이 서버」 탭이 보인다', await 피드.이서버탭.isVisible(), true);

    await 프로필.열기('hana_photo');
    const 프로필주소 = await verify('공개 프로필이 로그인 화면으로 가지 않는다', 로그인화면아님(), true);
    const 프로필내용 = await verify('공개 프로필에 표시 이름이 보인다', await 프로필.표시이름.isVisible(), true);

    const 글 = await 비회원글찾기API(page, 'hana_photo', '남산 야경');
    await 상세.열기(글경로(글));
    const 글주소 = await verify('공개 글이 로그인 화면으로 가지 않는다', 로그인화면아님(), true);
    const 글내용 = await verify('공개 글 본문이 보인다', await 상세.본문.isVisible(), true);

    await verify(
      '비회원으로 정보 · 유행 중 · 실시간 피드 · 공개 프로필 · 공개 글을 열면 로그인 화면으로 가지 않고 내용이 보인다',
      정보주소 && 정보내용 && 유행주소 && 유행내용 && 피드주소 && 피드내용 && 프로필주소 && 프로필내용 && 글주소 && 글내용,
      true,
    );
  });
});

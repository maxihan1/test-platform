import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 미디어뷰어 } from './pages/media-viewer.page.js';
import { 글카드 } from './pages/post-card.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-473',
  name: '미디어 뷰어 위에 뒤로 · 「다운로드」, 아래에 대체 텍스트와 답장 · 부스트 · 좋아요 · 북마크 · 공유 버튼이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  const 뷰어 = new 미디어뷰어(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('hana_photo 의 사진 글에서 사진을 누른다', async () => {
    await 프로필열기(driver, 'hana_photo');
    await 카드.사진누르기();
    const 다운로드 = await verify('「다운로드」가 보인다', await 뷰어.글자가뜰때까지('다운로드', 15_000), true);
    const 뒤로 = await verify('뒤로 가기가 보인다', await 뷰어.글자가뜰때까지('뒤로'), true);
    const 답장 = await verify('「답장」이 보인다', await 뷰어.글자가뜰때까지('답장'), true);
    const 부스트 = await verify('「부스트」가 보인다', await 뷰어.글자가뜰때까지('부스트'), true);
    const 좋아요 = await verify('「좋아요」가 보인다', await 뷰어.글자가뜰때까지('좋아요'), true);
    const 북마크 = await verify('「북마크」가 보인다', await 뷰어.글자가뜰때까지('북마크'), true);
    const 공유 = await verify('「공유」가 보인다', await 뷰어.글자가뜰때까지('공유'), true);
    await verify('미디어 뷰어 위에 뒤로 · 「다운로드」, 아래에 대체 텍스트와 답장 · 부스트 · 좋아요 · 북마크 · 공유 버튼이 보인다', 다운로드 && 뒤로 && 답장 && 부스트 && 좋아요 && 북마크 && 공유, true);
  });
});

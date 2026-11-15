import { defineCase, test, verify } from '@platform/kit';
import { 권한창답하기, 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 미디어뷰어 } from './pages/media-viewer.page.js';
import { 글카드 } from './pages/post-card.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-606',
  name: 'Android 9 이하 폰에서 저장소 권한을 막으면 「권한이 필요합니다」 창에 「설정 열기」 · 「취소」가 보인다',
  platforms: ['android'],
  held: '보류 — Android 9 이하 폰이 없다',
  techniques: ['동등 분할'],
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
  const 창 = new 확인창(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('Android 9 이하 폰에서 「다운로드」를 누르고 저장소 권한을 막는다', async () => {
    await 프로필열기(driver, 'hana_photo');
    await 카드.사진누르기();
    await 뷰어.누르기('다운로드');
    await 권한창답하기(driver, '거부');
    const 필요 = await verify('「권한이 필요합니다」가 보인다', await 뜰때까지(driver, 창.안의글자('권한이 필요합니다'), 10_000), true);
    const 설정열기 = await verify('「설정 열기」가 보인다', await 뜰때까지(driver, 창.안의글자('설정 열기'), 10_000), true);
    const 취소 = await verify('「취소」가 보인다', await 뜰때까지(driver, 창.안의글자('취소'), 10_000), true);
    await verify('Android 9 이하 폰에서 저장소 권한을 막으면 「권한이 필요합니다」 창에 「설정 열기」 · 「취소」가 보인다', 필요 && 설정열기 && 취소, true);
  });
});

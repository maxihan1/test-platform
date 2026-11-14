import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 뮤트시트 } from './pages/mute-sheet.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-375',
  name: '서버에 규칙이 없으면 신고 이유 「서버 규칙을 위반합니다」가 숨겨진다(우리 서버는 규칙 0개)',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 시트 = new 뮤트시트(driver);
  const 신고 = new 신고화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('promo_lee 프로필을 연다', async () => {
    await 프로필열기(driver, 'promo_lee');
    await verify('promo_lee 프로필 화면이 보인다', await 시트.프로필떴나(), true, { blocker: true });
  });
  await test.step('promo_lee 프로필 메뉴에서 「Report account」를 누른다', async () => {
    await 신고.프로필에서열기();
    const 이유 = await verify('신고 이유 목록이 보인다', await 신고.글자보이나('마음에 안 듭니다', 15_000), true);
    const 숨김 = await verify('「서버 규칙을 위반합니다」가 보이지 않는다', !(await 신고.글자보이나('서버 규칙을 위반합니다', 3_000)), true);
    await verify('서버에 규칙이 없으면 신고 이유 「서버 규칙을 위반합니다」가 숨겨진다(우리 서버는 규칙 0개)', 이유 && 숨김, true);
  }, { capture: true });
});

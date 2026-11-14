import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { QR화면 } from './pages/qr.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-337',
  name: 'QR 화면에 「공유」 · 「저장」이 보이고 저장하면 「저장됨」으로 바뀌며 메뉴에 「QR 코드 스캔」이 있다',
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
  const 프로필 = new 프로필화면(driver);
  const QR = new QR화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('내 프로필 메뉴에서 「View QR code」를 누르고 「저장」을 누른다', async () => {
    await 프로필.내프로필열기();
    await 프로필.메뉴고르기('View QR code');
    const 판정1 = await verify('QR 화면에 「공유」 버튼이 보인다', await QR.보이나(QR.공유), true);
    const 판정2 = await verify('QR 화면에 「저장」 버튼이 보인다', await QR.저장글(), '저장');
    const 판정3 = await verify('QR 화면 메뉴에 「QR 코드 스캔」이 보인다', await QR.보이나(QR.QR스캔), true);
    await QR.저장누르기();
    const 판정4 = await verify('저장한 뒤 버튼 글자가 「저장됨」으로 바뀐다', await QR.저장글이될때까지('저장됨'), true);
    await verify('QR 화면에 「공유」 · 「저장」이 보이고 저장하면 「저장됨」으로 바뀌며 메뉴에 「QR 코드 스캔」이 있다', 판정1 && 판정2 && 판정3 && 판정4, true);
  }, { capture: true });
});

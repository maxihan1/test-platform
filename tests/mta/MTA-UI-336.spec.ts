import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-336',
  name: '내 프로필 상단 메뉴에 「공유」 · 링크 복사 · 「View QR code」 · 「브라우저에서 열기」 · 「즐겨찾기」 · 「보관함」 · 「팔로우 중인 해시태그」 · 「계정 설정」이 보인다',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('내 프로필 상단 메뉴를 연다', async () => {
    await 프로필.내프로필열기();
    const 항목 = await 프로필.메뉴항목들();
    const 판정1 = await verify('내 프로필 상단 메뉴에 「공유」가 보인다', 항목.includes('공유'), true);
    const 판정2 = await verify('내 프로필 상단 메뉴에 링크 복사가 보인다', 항목.includes('링크 복사'), true);
    const 판정3 = await verify('내 프로필 상단 메뉴에 「View QR code」가 보인다', 항목.includes('View QR code'), true);
    const 판정4 = await verify('내 프로필 상단 메뉴에 「브라우저에서 열기」가 보인다', 항목.includes('브라우저에서 열기'), true);
    const 판정5 = await verify('내 프로필 상단 메뉴에 「즐겨찾기」가 보인다', 항목.includes('즐겨찾기'), true);
    const 판정6 = await verify('내 프로필 상단 메뉴에 「보관함」이 보인다', 항목.includes('보관함'), true);
    const 판정7 = await verify('내 프로필 상단 메뉴에 「팔로우 중인 해시태그」가 보인다', 항목.includes('팔로우 중인 해시태그'), true);
    const 판정8 = await verify('내 프로필 상단 메뉴에 「계정 설정」이 보인다', 항목.includes('계정 설정'), true);
    await verify('내 프로필 상단 메뉴에 「공유」 · 링크 복사 · 「View QR code」 · 「브라우저에서 열기」 · 「즐겨찾기」 · 「보관함」 · 「팔로우 중인 해시태그」 · 「계정 설정」이 보인다', 판정1 && 판정2 && 판정3 && 판정4 && 판정5 && 판정6 && 판정7 && 판정8, true);
  }, { capture: true });
});

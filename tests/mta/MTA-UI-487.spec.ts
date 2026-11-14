import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 보이나 } from './helpers/app.helper.js';
import { 글자요소가보이나, 더보기항목들, 메뉴에있나, 설정줄열기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-487',
  name: '일반 계정(qa_user1 · qa_user2)은 글쓰기 · 팔로우 · 뮤트 · 차단 · 신고 · 목록 · 필터 · 설정을 쓴다',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('일반 계정이 쓰는 기능의 진입점을 확인한다', async () => {
    const 글쓰기쪽 = await verify('일반 계정에 글쓰기 진입점이 보인다', await 보이나(driver, 홈.글쓰기), true);
    const 설정쪽 = await verify('일반 계정에 설정 진입점이 보인다', await 보이나(driver, 홈.설정), true);
    const 항목들 = await 더보기항목들(driver, '오늘의 카페 추천');
    const 팔로우 = await verify('남의 글 더보기에 팔로우 항목이 보인다', 메뉴에있나(항목들, '<이름> 팔로우') || 메뉴에있나(항목들, '<이름> 팔로우 해제'), true);
    const 뮤트 = await verify('남의 글 더보기에 뮤트 항목이 보인다', 메뉴에있나(항목들, '<이름> 뮤트'), true);
    const 차단 = await verify('남의 글 더보기에 차단 항목이 보인다', 메뉴에있나(항목들, '<이름> 차단'), true);
    const 신고 = await verify('남의 글 더보기에 신고 항목이 보인다', 메뉴에있나(항목들, '<이름> 신고'), true);
    const 목록 = await verify('남의 글 더보기에 목록 항목이 보인다', 메뉴에있나(항목들, '목록에서 추가 또는 제거'), true);
    await 설정줄열기(driver, ['@qa_user1@mastodon.maxihan.com']);
    const 필터 = await verify('계정 설정에 필터 항목이 보인다', await 글자요소가보이나(driver, '필터'), true);
    await verify('일반 계정(qa_user1 · qa_user2)은 글쓰기 · 팔로우 · 뮤트 · 차단 · 신고 · 목록 · 필터 · 설정을 쓴다', 글쓰기쪽 && 설정쪽 && 팔로우 && 뮤트 && 차단 && 신고 && 목록 && 필터, true);
  }, { capture: true });
});

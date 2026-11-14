import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 뮤트시트 } from './pages/mute-sheet.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-446',
  name: '「스팸입니다」 · 「불법입니다」 · 「다른 문제가 있습니다」를 고르고 「다음」을 누르면 글 고르기 「이 신고에 대해서 더 참고해야 할 게시물이 있나요?」로 간다',
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
  let 스팸 = false;
  let 불법 = false;

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('promo_lee 프로필을 연다', async () => {
    await 프로필열기(driver, 'promo_lee');
    await verify('promo_lee 프로필 화면이 보인다', await 시트.프로필떴나(), true, { blocker: true });
  });
  await test.step('promo_lee 프로필 메뉴에서 신고를 연다', async () => {
    await 신고.프로필에서열기();
    await verify('신고 이유 목록이 보인다', await 신고.글자보이나('마음에 안 듭니다', 15_000), true, { blocker: true });
  });
  await test.step('promo_lee 신고에서 「스팸입니다」를 고르고 「다음」을 누른다', async () => {
    await 신고.이유고르기('스팸입니다');
    await 신고.다음누르기();
    스팸 = await verify('「스팸입니다」 뒤 글 고르기 질문이 보인다', await 신고.글자보이나('이 신고에 대해서 더 참고해야 할 게시물이 있나요?', 15_000), true);
  }, { capture: true });

  await test.step('신고 이유 선택으로 돌아가 「불법입니다」를 고르고 「다음」을 누른다', async () => {
    await 신고.이전으로();
    await verify('신고 이유 목록으로 돌아온다', await 신고.글자보이나('마음에 안 듭니다', 15_000), true, { blocker: true });
    await 신고.이유고르기('불법입니다');
    await 신고.다음누르기();
    불법 = await verify('「불법입니다」 뒤 글 고르기 질문이 보인다', await 신고.글자보이나('이 신고에 대해서 더 참고해야 할 게시물이 있나요?', 15_000), true);
  });

  await test.step('다시 신고 이유 선택으로 돌아가 「다른 문제가 있습니다」를 고르고 「다음」을 누른다', async () => {
    await 신고.이전으로();
    await verify('신고 이유 목록으로 다시 돌아온다', await 신고.글자보이나('마음에 안 듭니다', 15_000), true, { blocker: true });
    await 신고.이유고르기('다른 문제가 있습니다');
    await 신고.다음누르기();
    const 다른 = await verify('「다른 문제가 있습니다」 뒤 글 고르기 질문이 보인다', await 신고.글자보이나('이 신고에 대해서 더 참고해야 할 게시물이 있나요?', 15_000), true);
    await verify('「스팸입니다」 · 「불법입니다」 · 「다른 문제가 있습니다」를 고르고 「다음」을 누르면 글 고르기 「이 신고에 대해서 더 참고해야 할 게시물이 있나요?」로 간다', 스팸 && 불법 && 다른, true);
  });
});

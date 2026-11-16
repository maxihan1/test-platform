import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 뮤트메뉴항목, 카드더보기열기 } from './helpers/card-menu.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 뮤트풀기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 뮤트차단시트 } from './pages/mute-block-sheet.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-439',
  name: '목록 화면에서 news_bot 을 뮤트하면 그 계정 글이 목록에서 바로 사라진다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    목록이름: z.string().min(1).describe('열어 볼 내 목록 이름 — news_bot 이 든 시드 목록').default('개발 소식'),
    사용자명: z.string().min(1).describe('뮤트할 사용자명 — 목록 구성원').default('news_bot'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 시트 = new 뮤트차단시트(driver);
  try {
    await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });
    await test.step('목록 「개발 소식」에서 news_bot 글을 찾는다', async () => {
      await 홈.목록고르기(params.목록이름);
      await verify('목록 타임라인의 옵션 더보기 버튼이 보인다', await 뜰때까지(driver, 홈.옵션더보기, 15_000), true, { blocker: true });
      await verify('목록에 news_bot 글이 보인다', await 뜰때까지(driver, 홈.굴려서글자포함(`@${params.사용자명}`), 25_000), true, { blocker: true });
    });
    await test.step('목록 「개발 소식」에서 news_bot 을 뮤트한다', async () => {
      await verify('news_bot 글 더보기 메뉴가 열린다', await 카드더보기열기(driver, params.사용자명), true, { blocker: true });
      await verify('더보기 메뉴에 뮤트 항목이 보인다', await 뜰때까지(driver, 뮤트메뉴항목, 10_000), true, { blocker: true });
      await driver.$(뮤트메뉴항목).click();
      await 시트.단추누르기('뮤트');
      await verify('목록 화면에서 news_bot 을 뮤트하면 그 계정 글이 목록에서 바로 사라진다', await 사라질때까지(driver, 홈.목록글자포함(`@${params.사용자명}`), 15_000), true);
    });
  } finally {
    await 뮤트풀기(driver, params.사용자명);
  }
});

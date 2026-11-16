import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 보이나, 칸에적기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 표시글 } from './helpers/post.helper.js';
import { 계정설정열기, 설정줄열기, 필터지우기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 필터화면 } from './pages/filter-edit.page.js';
import { 확인창 } from './components/dialog.component.js';

export const spec = defineCase({
  tcId: 'MTA-FN-495',
  name: '뮤트된 단어를 골라 지우면 「단어를 삭제하시겠습니까?」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    첫째단어: z.string().min(1).describe('뮤트할 첫째 단어 — 공백 없는 짧은 글').default('qa단어일'),
    둘째단어: z.string().min(1).describe('뮤트할 둘째 단어 — 첫째와 다른 짧은 글').default('qa단어이'),
  }),
  expected: z.object({
    묻는글: z.string().describe('단어 삭제 확인 창 질문의 끝 글').default('단어를 삭제하시겠습니까?'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 필터 = new 필터화면(driver);
  const 창 = new 확인창(driver);
  const 제목 = 표시글('필터');
  try {
    await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });

    await test.step('계정 설정에서 「필터」를 열고 새 필터 하나를 만든다', async () => {
      await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
      await verify('필터 목록이 열린다', await 설정줄열기(driver, '필터'), true, { blocker: true });
      await driver.$(필터.추가버튼).click();
      await verify('필터 추가 화면이 열린다', await 필터.편집그려질때까지(), true, { blocker: true });
      await 칸에적기(await driver.$(필터.제목칸).getElement(), 제목);
      await driver.$(필터.저장).click();
      await verify('새 필터가 목록에 생긴다', await 뜰때까지(driver, 필터.줄(제목), 15_000), true, { blocker: true });
    });

    await test.step('새 필터 「뮤트된 단어」에서 단어 둘을 더한다', async () => {
      await 필터.줄누르기(제목);
      await verify('필터 편집 화면이 열린다', await 필터.편집그려질때까지(), true, { blocker: true });
      await 필터.줄누르기('뮤트된 단어');
      await verify('뮤트된 단어 화면이 열린다', await 뜰때까지(driver, 필터.단어추가목록버튼, 10_000), true, { blocker: true });
      for (const 단어 of [params.첫째단어, params.둘째단어]) {
        await driver.$(필터.단어추가목록버튼).click();
        await verify('「뮤트할 단어 추가」 창이 뜬다', await 뜰때까지(driver, 필터.단어칸, 10_000), true, { blocker: true });
        await 칸에적기(await driver.$(필터.단어칸).getElement(), 단어);
        await driver.$(필터.단어추가버튼).click();
        await verify('더한 단어가 목록에 보인다', await 뜰때까지(driver, 필터.줄(단어), 10_000), true, { blocker: true });
      }
    });

    await test.step('뮤트된 단어 둘을 골라 지운다', async () => {
      await driver.$(필터.옵션더보기).click();
      await 홈.메뉴.고르기('선택');
      await driver.$(필터.줄(params.첫째단어)).click();
      await driver.$(필터.줄(params.둘째단어)).click();
      await verify('단어 둘이 골라져 선택 막대가 보인다', await 뜰때까지(driver, 필터.선택삭제, 10_000), true, { blocker: true });
      await driver.$(필터.선택삭제).click();
      await verify('뮤트된 단어를 골라 지우면 「단어를 삭제하시겠습니까?」가 보인다', await 뜰때까지(driver, 필터.확인제목글(expected.묻는글), 10_000), true);
      await 창.취소();
      await driver.$(필터.선택닫기).click();
      await driver.back();
      if (await 보이나(driver, 필터.저장)) await driver.$(필터.저장).click();
    });
  } finally {
    await 필터지우기(driver, 계정줄(params.loginId ?? ''), 제목);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 칸에적기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 표시글 } from './helpers/post.helper.js';
import { 설정줄열기, 계정설정열기, 필터지우기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 필터화면 } from './pages/filter-edit.page.js';
import { 확인창 } from './components/dialog.component.js';

export const spec = defineCase({
  tcId: 'MTA-FN-496',
  name: '「필터 삭제」를 누르면 「필터를 삭제하시겠습니까?」와 「이 필터는 당신의 모든 기기의 계정에서 삭제됩니다.」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    묻는글: z.string().describe('필터 삭제 확인 창 질문의 끝 글').default('필터를 삭제하시겠습니까?'),
    안내글: z.string().describe('필터 삭제 확인 창 안내').default('이 필터는 당신의 모든 기기의 계정에서 삭제됩니다.'),
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
    await test.step('계정 설정을 연다', async () => {
      await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
    });
    await test.step('계정 설정에서 「필터」를 연다', async () => {
      await verify('필터 목록이 열린다', await 설정줄열기(driver, '필터'), true, { blocker: true });
    });
    await test.step('필터 목록에서 「필터 추가」를 누른다', async () => {
      await driver.$(필터.추가버튼).click();
      await verify('필터 추가 화면이 열린다', await 필터.편집그려질때까지(), true, { blocker: true });
    });
    await test.step('새 필터 하나를 만든다', async () => {
      await 칸에적기(await driver.$(필터.제목칸).getElement(), 제목);
      await driver.$(필터.저장).click();
      await verify('새 필터가 목록에 생긴다', await 뜰때까지(driver, 필터.줄(제목), 15_000), true, { blocker: true });
    });
    await test.step('새 필터 편집 화면에서 「필터 삭제」를 누른다', async () => {
      await 필터.줄누르기(제목);
      await verify('필터 편집 화면에 「필터 삭제」가 보인다', await 뜰때까지(driver, 필터.화면글정확히('필터 삭제'), 15_000), true, { blocker: true });
      await driver.$(필터.화면글정확히('필터 삭제')).click();
      const 묻기 = await verify('필터 삭제 확인 창에 「필터를 삭제하시겠습니까?」가 보인다', await 뜰때까지(driver, 필터.화면글(expected.묻는글), 10_000), true);
      const 안내 = await verify('필터 삭제 확인 창에 「이 필터는 당신의 모든 기기의 계정에서 삭제됩니다.」가 보인다', await 뜰때까지(driver, 필터.화면글(expected.안내글), 10_000), true);
      await verify('「필터 삭제」를 누르면 「필터를 삭제하시겠습니까?」와 「이 필터는 당신의 모든 기기의 계정에서 삭제됩니다.」가 보인다', 묻기 && 안내, true);
      await 창.취소();
    });
  } finally {
    await 필터지우기(driver, 계정줄(params.loginId ?? ''), 제목);
  }
});

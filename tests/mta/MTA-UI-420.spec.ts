import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 필터편집화면 } from './pages/filter-edit.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 필터목록화면 } from './pages/set-filters.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-420',
  name: '필터 「기간」은 「무기한」 · 30분 · 1시간 · 12시간 · 1일 · 3일 · 1 주 · 「사용자 지정」(→ 「종료: <날짜>」) 가운데 고른다',
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
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);
  const 필터목록 = new 필터목록화면(driver);
  const 편집 = new 필터편집화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('설정에서 필터 목록을 연다', async () => {
    await 설정.열기();
    await 설정.계정줄누르기();
    await 계정설정.줄누르기('필터');
    await verify('필터 목록에 「필터 추가」 단추가 보인다', await 필터목록.떴나(), true, { blocker: true });
  });
  await test.step('필터 목록에서 필터 추가 화면을 연다', async () => {
    await 필터목록.추가누르기();
    await verify('필터 편집 화면에 「기간」 줄이 보인다', await 편집.떴나(), true, { blocker: true });
  });
  await test.step('필터 추가에서 「기간」을 누른다', async () => {
    await 편집.줄누르기('기간');
    const 삼십분 = await verify('선택지 「30분」이 보인다', await 편집.글자보이나('30분'), true);
    const 한시간 = await verify('선택지 「1시간」이 보인다', await 편집.글자보이나('1시간'), true);
    const 열두시간 = await verify('선택지 「12시간」이 보인다', await 편집.글자보이나('12시간'), true);
    const 하루 = await verify('선택지 「1일」이 보인다', await 편집.글자보이나('1일'), true);
    const 사흘 = await verify('선택지 「3일」이 보인다', await 편집.글자보이나('3일'), true);
    const 주 = await verify('선택지 「1 주」가 보인다', await 편집.글자보이나('1 주'), true);
    const 무기한 = await verify('선택지 「무기한」이 보인다', (await 편집.선택지수('무기한')) >= 2, true);
    const 지정 = await verify('선택지 「사용자 지정」이 보인다', await 편집.글자보이나('사용자 지정'), true);
    await 편집.선택지고르기('사용자 지정');
    await verify('날짜 고르기 창이 뜬다', await 편집.확인창떴나(), true);
    await 편집.창확인누르기();
    const 종료 = await verify('「종료: <날짜>」가 보인다', await 편집.글보이나('종료: <날짜>'), true);
    await verify('필터 「기간」은 「무기한」 · 30분 · 1시간 · 12시간 · 1일 · 3일 · 1 주 · 「사용자 지정」(→ 「종료: <날짜>」) 가운데 고른다', 삼십분 && 한시간 && 열두시간 && 하루 && 사흘 && 주 && 무기한 && 지정 && 종료, true);
  }, { capture: true });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱데이터지우기 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 동작설정화면 } from './pages/set-behavior.page.js';
import { 설정화면 } from './pages/settings.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-476',
  name: '동작 · 디스플레이 설정과 사전 시트 「다시 알리지 않습니다」 · 최근 검색 같은 기기 값은 이 기기에만 저장되고 앱 데이터를 지우면 사라져 다시 로그인해야 한다',
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
  const 동작 = new 동작설정화면(driver);
  const 시작 = new 시작화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('설정 「동작」 값을 바꾼 뒤 앱 데이터를 지우고 다시 켠다', async () => {
    await 설정.줄누르기('동작');
    await verify('동작 화면이 열린다', await 동작.떴나(), true);
    await 동작.줄누르기('게시물 삭제 전 묻기');
    const 바뀜 = await verify('「게시물 삭제 전 묻기」가 꺼져 있다', await 동작.꺼졌나('게시물 삭제 전 묻기'), true);
    await 앱데이터지우기(driver);
    const 시작화면 = await verify('앱 데이터를 지운 뒤 시작 화면에 「로그인」이 보인다', await 시작.떴나(60_000), true);
    await verify('동작 · 디스플레이 설정과 사전 시트 「다시 알리지 않습니다」 · 최근 검색 같은 기기 값은 이 기기에만 저장되고 앱 데이터를 지우면 사라져 다시 로그인해야 한다', 바뀜 && 시작화면, true);
  }, { capture: true });
});

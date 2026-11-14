import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 디스플레이설정화면 } from './pages/set-display.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-470',
  name: '「디스플레이」 「테마-화면 스타일」 기본값은 「기기 모드에 맞춰 자동 적용」이고 「밝음」 · 「어두움」 · 자동 중 고르면 바로 적용된다',
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
  const 디스플레이 = new 디스플레이설정화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('설정 「디스플레이」 「테마-화면 스타일」에서 「어두움」을 고른다', async () => {
    await 설정.줄누르기('디스플레이');
    await verify('디스플레이 화면이 열린다', await 디스플레이.떴나(), true);
    const 기본 = await verify('「테마-화면 스타일」 기본값이 「기기 모드에 맞춰 자동 적용」이다', await 디스플레이.부제글('테마-화면 스타일'), '기기 모드에 맞춰 자동 적용');
    await 디스플레이.줄누르기('테마-화면 스타일');
    const 어두움 = await verify('선택지에 「어두움」이 있다', await 디스플레이.선택지보이나('어두움'), true);
    const 밝음 = await verify('선택지에 「밝음」이 있다', await 디스플레이.선택지보이나('밝음'), true);
    const 자동 = await verify('선택지에 「기기 모드에 맞춰 자동 적용」이 있다', (await 디스플레이.선택지수('기기 모드에 맞춰 자동 적용')) >= 2, true);
    await 디스플레이.선택지고르기('어두움');
    const 적용 = await verify('「테마-화면 스타일」 값이 「어두움」으로 바뀐다', await 디스플레이.부제가될때까지('테마-화면 스타일', '어두움'), true);
    await verify('「디스플레이」 「테마-화면 스타일」 기본값은 「기기 모드에 맞춰 자동 적용」이고 「밝음」 · 「어두움」 · 자동 중 고르면 바로 적용된다', 기본 && 어두움 && 밝음 && 자동 && 적용, true);
  }, { capture: true });
});

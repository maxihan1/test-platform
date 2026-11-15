import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-408',
  name: '계정 설정에 「프라이버시와 노출 범위」 · 「필터」 · 「알림」 · 「게시 기본값」 · 「이 서버에 대해서」 · 「이 계정으로 전환」 · 「계정 삭제」 · 「로그아웃」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    프라이버시줄: z.string().describe('계정 설정 줄 이름').default('프라이버시와 노출 범위'),
    필터줄: z.string().describe('계정 설정 줄 이름').default('필터'),
    알림줄: z.string().describe('계정 설정 줄 이름').default('알림'),
    게시줄: z.string().describe('계정 설정 줄 이름').default('게시 기본값'),
    서버줄: z.string().describe('계정 설정 줄 이름').default('이 서버에 대해서'),
    전환줄: z.string().describe('계정 설정 줄 이름').default('이 계정으로 전환'),
    삭제줄: z.string().describe('계정 설정 줄 이름').default('계정 삭제'),
    로그아웃줄: z.string().describe('계정 설정 줄 이름').default('로그아웃'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('계정 설정을 연다', async () => {
    await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
    const 줄1 = await verify('계정 설정에 「프라이버시와 노출 범위」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.프라이버시줄), 10_000), true);
    const 줄2 = await verify('계정 설정에 「필터」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.필터줄), 10_000), true);
    const 줄3 = await verify('계정 설정에 「알림」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.알림줄), 10_000), true);
    const 줄4 = await verify('계정 설정에 「게시 기본값」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.게시줄), 10_000), true);
    const 줄5 = await verify('계정 설정에 「이 서버에 대해서」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.서버줄), 10_000), true);
    const 줄6 = await verify('계정 설정에 「이 계정으로 전환」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.전환줄), 10_000), true);
    const 줄7 = await verify('계정 설정에 「계정 삭제」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.삭제줄), 10_000), true);
    const 줄8 = await verify('계정 설정에 「로그아웃」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.로그아웃줄), 10_000), true);
    await verify('계정 설정에 「프라이버시와 노출 범위」 · 「필터」 · 「알림」 · 「게시 기본값」 · 「이 서버에 대해서」 · 「이 계정으로 전환」 · 「계정 삭제」 · 「로그아웃」이 보인다', 줄1 && 줄2 && 줄3 && 줄4 && 줄5 && 줄6 && 줄7 && 줄8, true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세열기 } from './helpers/nav.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-592',
  name: '팔로잉이 0명인 사람 글에 「답장」을 누르면 「안녕하세요, 새로운 연결!」 시트 없이 답장 글쓰기가 열린다',
  platforms: ['android'],
  held: '보류 — 팔로잉 0명이고 글이 있는 시드 계정이 없다',
  techniques: ['경계값 분석'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글상세 = new 글상세화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('팔로잉 0명인 사람 글에 「답장」을 누른다', async () => {
    await 글상세열기(driver, 'cafe_moon', '성수동 로스터리');
    await driver.$(글상세.답장).click();
    const 열림 = await verify('답장 글쓰기가 열린다', await 글쓰기.그려질때까지(), true);
    const 시트없음 = await verify('「안녕하세요, 새로운 연결!」 시트가 보이지 않는다', await 보이나(driver, 글상세.전체글자포함('안녕하세요, 새로운 연결!')), false);
    await verify('팔로잉이 0명인 사람 글에 「답장」을 누르면 「안녕하세요, 새로운 연결!」 시트 없이 답장 글쓰기가 열린다', 열림 && 시트없음, true);
  });
});

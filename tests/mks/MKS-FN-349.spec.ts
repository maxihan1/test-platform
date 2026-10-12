import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { API로그인, 계정값 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-349',
  name: '본문 칸에 2000자를 넣으면 2000자가 다 들어간다',
  techniques: ['경계값 분석'],
  precondition: ['테스트 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 계정 = 계정값(params);
  const 쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);

  await test.step('테스트 계정으로 로그인한다', async () => {
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('글쓰기 화면을 연다', async () => {
    await 방해막기(page);
    await 쓰기.열기();
    await 쓰기.제목칸.waitFor();
    await 머리.마이페이지.or(머리.로그인).first().waitFor();
  });

  await test.step('로그인한 글쓰기 화면인지 확인한다', async () => {
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    await verify('글쓰기 화면이 열려 있다', 경로(page), 글쓰기화면.주소, { blocker: true });
  });

  await test.step('글쓰기 본문 칸에 2000자를 넣는다', async () => {
    await 쓰기.본문칸.fill('가'.repeat(2000));
    await verify('본문 칸에 2000자를 넣으면 2000자가 다 들어간다', (await 쓰기.본문칸.inputValue()).length, 2000);
  });

  await test.step('글쓰기 본문 칸에 2001자를 넣는다', async () => {
    await 쓰기.본문칸.fill('가'.repeat(2001));
    await verify('본문 칸에 2001자를 넣으면 2000자까지만 들어간다', (await 쓰기.본문칸.inputValue()).length, 2000);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-067',
  name: '글쓰기 제목 칸에 51자를 적으면 50자까지만 들어간다',
  platforms: ['desktop'],
  precondition: ['회원으로 글쓰기 화면을 열었다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 글쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);

  await test.step('회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 방해막기(page);
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await 글쓰기.열기();
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    await verify('글쓰기 화면 제목이 「글쓰기」 이다', await 글쓰기.화면제목.innerText(), '글쓰기', { blocker: true });
  });

  await test.step('제목 칸에 51자를 적는다', async () => {
    await 글쓰기.제목칸.fill('가'.repeat(51));
    await verify('글쓰기 제목 칸에 51자를 적으면 50자까지만 들어간다', (await 글쓰기.제목칸.inputValue()).length, 50);
  });

  await test.step('제목 칸에 50자를 적는다', async () => {
    await 글쓰기.제목칸.fill('나'.repeat(50));
    await verify('글쓰기 제목 칸에 50자를 적으면 50자가 모두 들어간다', (await 글쓰기.제목칸.inputValue()).length, 50);
  });

  await test.step('본문 칸에 2001자를 적는다', async () => {
    await 글쓰기.본문칸.fill('가'.repeat(2001));
    await verify('글쓰기 본문 칸에 2001자를 적으면 2000자까지만 들어간다', (await 글쓰기.본문칸.inputValue()).length, 2000);
  });

  await test.step('본문 칸에 2000자를 적는다', async () => {
    await 글쓰기.본문칸.fill('나'.repeat(2000));
    await verify('글쓰기 본문 칸에 2000자를 적으면 2000자가 모두 들어간다', (await 글쓰기.본문칸.inputValue()).length, 2000);
  });
});

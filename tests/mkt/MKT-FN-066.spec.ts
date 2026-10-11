import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 글머리, 등록뒤글번호 } from './helpers/board.helper.js';
import { 글지우기, 지난글치우기 } from './helpers/post.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-066',
  name: '제목을 1자로 적어 등록하면 글이 등록되지 않는다',
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
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 만든글들: number[] = [];
  const 정상본문 = '경계값을 보려고 적은 본문입니다.';
  const 정상제목 = `${글머리(spec.tcId)}경계`;

  async function 등록해보기(제목: string, 본문: string): Promise<{ 등록됨: boolean; 주소: string }> {
    await 글쓰기.열기();
    await 글쓰기.채우기({ 분류: '자유', 제목, 본문 });
    const 응답 = await 글쓰기.등록누르고응답받기();
    const 번호 = await 등록뒤글번호(page, 응답);
    if (번호 !== null) 만든글들.push(번호);
    return { 등록됨: 응답.ok(), 주소: new URL(page.url()).pathname };
  }

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('제목을 1자로 적어 「등록」 을 누른다', async () => {
      await verify('제목을 1자로 적어 등록하면 글이 등록되지 않는다', await 등록해보기('가', 정상본문), { 등록됨: false, 주소: '/board/write' });
    });

    await test.step('제목을 2자로 적어 「등록」 을 누른다', async () => {
      const 결과 = await 등록해보기('가나', 정상본문);
      await 상세.제목.filter({ hasText: '가나' }).waitFor();
      await verify('제목을 2자로 적어 등록하면 그 글 상세로 간다', { 등록됨: 결과.등록됨, 상세: /^\/board\/\d+$/.test(new URL(page.url()).pathname) }, { 등록됨: true, 상세: true });
    });

    await test.step('제목을 50자로 적어 「등록」 을 누른다', async () => {
      const 제목 = 정상제목.padEnd(50, '가');
      const 결과 = await 등록해보기(제목, 정상본문);
      await 상세.제목.filter({ hasText: 정상제목 }).waitFor();
      await verify('제목을 50자로 적어 등록하면 그 글 상세로 간다', { 등록됨: 결과.등록됨, 상세: /^\/board\/\d+$/.test(new URL(page.url()).pathname) }, { 등록됨: true, 상세: true });
    });

    await test.step('본문을 9자로 적어 「등록」 을 누른다', async () => {
      await verify('본문을 9자로 적어 등록하면 글이 등록되지 않는다', await 등록해보기(`${정상제목}9`, '가'.repeat(9)), { 등록됨: false, 주소: '/board/write' });
    });

    await test.step('본문을 10자로 적어 「등록」 을 누른다', async () => {
      const 결과 = await 등록해보기(`${정상제목}10`, '가'.repeat(10));
      await 상세.제목.filter({ hasText: `${정상제목}10` }).waitFor();
      await verify('본문을 10자로 적어 등록하면 그 글 상세로 간다', { 등록됨: 결과.등록됨, 상세: /^\/board\/\d+$/.test(new URL(page.url()).pathname) }, { 등록됨: true, 상세: true });
    });

    await test.step('본문을 2000자로 적어 「등록」 을 누른다', async () => {
      const 결과 = await 등록해보기(`${정상제목}2000`, '가'.repeat(2000));
      await 상세.제목.filter({ hasText: `${정상제목}2000` }).waitFor();
      await verify('본문을 2000자로 적어 등록하면 그 글 상세로 간다', { 등록됨: 결과.등록됨, 상세: /^\/board\/\d+$/.test(new URL(page.url()).pathname) }, { 등록됨: true, 상세: true });
    });
  } finally {
    for (const 번호 of 만든글들) await 글지우기(page.request, 번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});

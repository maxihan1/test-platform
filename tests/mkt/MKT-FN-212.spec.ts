import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글본문10자, 글자, 등록글정리, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-212',
  name: '제목이 1자면 글이 등록되지 않고 글쓰기 화면에 머문다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({}),
  expected: z.object({}),
});

const 상세경로 = /^\/board\/\d+$/;

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 쓰기 = new 글쓰기화면(page);
    const 상세 = new 게시글상세화면(page);

    const 등록하고상세기다리기 = async (글제목: string): Promise<string> => {
      await 쓰기.등록하기();
      await 상세.제목기다리기(글제목);
      등록글정리(page.request, 정리, page.url());
      return 상세.경로읽기();
    };

    await test.step('새로 만든 회원으로 로그인한다', async () => {
      await 회원로그인(page.request, 정리);
      await 안내창끄기(page);
      await 쓰기.확인창받기('accept');
    });

    await test.step('분류 「자유」 · 본문 10자에 제목 1자를 적고 「등록」을 누른다', async () => {
      await 쓰기.열기();
      await verify('글쓰기 화면이 열린다', await 쓰기.제목글.isVisible(), true, { blocker: true });
      await 쓰기.채우기({ 분류: '자유', 제목: '가', 본문: 글본문10자 });
      await 쓰기.등록하기();
      await 쓰기.토스트.전부.first().waitFor();
      await verify(
        '제목이 1자면 글이 등록되지 않고 글쓰기 화면에 머문다',
        { 경로: await 쓰기.경로읽기(), 화면: await 쓰기.제목글.isVisible() },
        { 경로: '/board/write', 화면: true },
      );
    });

    await test.step('제목을 2자로 고치고 「등록」을 누른다', async () => {
      await 쓰기.채우기({ 제목: '가나' });
      const 경로 = await 등록하고상세기다리기('가나');
      await verify('제목이 2자면 글이 등록되어 상세 화면으로 간다', 상세경로.test(경로), true);
    });

    await test.step('새 글쓰기에서 제목 50자로 「등록」을 누른다', async () => {
      await 쓰기.열기();
      await 쓰기.채우기({ 분류: '자유', 제목: 글자(50), 본문: 글본문10자 });
      const 경로 = await 등록하고상세기다리기(글자(50));
      await verify('제목이 50자면 글이 등록된다', 상세경로.test(경로), true);
    });

    await test.step('제목 칸에 51자를 적는다', async () => {
      await 쓰기.열기();
      await 쓰기.제목.fill(글자(51));
      await verify('제목 칸에 51자를 적으면 50자까지만 들어간다', (await 쓰기.제목읽기()).length, 50);
    });

    await test.step('새 글쓰기에서 본문 9자로 「등록」을 누른다', async () => {
      await 쓰기.열기();
      await 쓰기.채우기({ 분류: '자유', 제목: '가나다', 본문: 글자(9) });
      await 쓰기.등록하기();
      await 쓰기.토스트.전부.first().waitFor();
      await verify('본문이 9자면 글이 등록되지 않는다', await 쓰기.경로읽기(), '/board/write');
    });

    await test.step('본문을 10자로 고치고 「등록」을 누른다', async () => {
      await 쓰기.채우기({ 본문: 글본문10자 });
      const 경로 = await 등록하고상세기다리기('가나다');
      await verify('본문이 10자면 글이 등록된다', 상세경로.test(경로), true);
    });

    await test.step('새 글쓰기에서 본문 2000자로 「등록」을 누른다', async () => {
      await 쓰기.열기();
      await 쓰기.채우기({ 분류: '자유', 제목: '가나다', 본문: 글자(2000) });
      const 경로 = await 등록하고상세기다리기('가나다');
      await verify('본문이 2000자면 글이 등록된다', 상세경로.test(경로), true);
    });

    await test.step('본문 칸에 2001자를 적는다', async () => {
      await 쓰기.열기();
      await 쓰기.본문.fill(글자(2001));
      await verify('본문 칸에 2001자를 적으면 2000자까지만 들어간다', (await 쓰기.본문읽기()).length, 2000);
    });
  } finally {
    await 정리.비우기();
  }
});

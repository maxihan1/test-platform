import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 글자 } from './helpers/common-tools.helper.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 글번호읽기, 창기록하기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-162',
  name: '본문 9자로 등록하면 글쓰기 화면에 그대로 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    짧은본문글자수: z.number().int().describe('막히는 본문의 글자 수 — 0자 이상 9자 이하').default(9),
    최소본문글자수: z.number().int().describe('등록되는 짧은 본문의 글자 수 — 10자 이상 2000자 이하').default(10),
    최대본문글자수: z.number().int().describe('등록되는 긴 본문의 글자 수 — 10자 이상 2000자 이하').default(2000),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  창기록하기(page);
  const 만든글: number[] = [];

  try {
    await test.step('일회용 회원으로 로그인해 글쓰기 화면을 연다', async () => {
      await 일회용회원으로로그인(page);
      await 안내창막기(page);
      await 쓰기.열기();
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.큰제목.isVisible(), true, { blocker: true });
    });

    await test.step('본문 9자로 「등록」을 누른다', async () => {
      await 쓰기.채우기({ 분류: '자유', 제목: '본문 길이를 시험하는 제목', 본문: 글자(params.짧은본문글자수) });
      const 응답 = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/posts' && r.request().method() === 'POST');
      await 쓰기.등록.click();
      await 응답;
      await verify('본문 9자로 등록하면 글쓰기 화면에 그대로 있다', await 쓰기.큰제목.isVisible(), true);
    });

    await test.step('본문 10자로 「등록」을 누른다', async () => {
      await 쓰기.채우기({ 본문: 글자(params.최소본문글자수) });
      await Promise.all([page.waitForURL(/\/board\/\d+$/), 쓰기.등록.click()]);
      await 상세.그려질때까지();
      만든글.push(글번호읽기(page));
      await verify('본문 10자로 등록하면 방금 쓴 글의 상세로 간다', await 상세.제목.innerText(), '본문 길이를 시험하는 제목');
    });

    await test.step('본문 2000자로 「등록」을 누른다', async () => {
      await 쓰기.열기();
      await 쓰기.채우기({ 분류: '자유', 제목: '본문 길이를 시험하는 제목', 본문: 글자(params.최대본문글자수) });
      await Promise.all([page.waitForURL(/\/board\/\d+$/), 쓰기.등록.click()]);
      await 상세.그려질때까지();
      만든글.push(글번호읽기(page));
      await verify('본문 2000자로 등록하면 방금 쓴 글의 상세로 간다', await 상세.제목.innerText(), '본문 길이를 시험하는 제목');
    });
  } finally {
    for (const 번호 of 만든글) await 글지우기(page.request, 번호);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 글자 } from './helpers/common-tools.helper.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-138',
  name: '댓글 칸을 비우고 「등록」을 누르면 댓글이 늘지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    짧은댓글글자수: z.number().int().describe('등록할 짧은 댓글의 글자 수 — 1자 이상 300자 이하').default(1),
    긴댓글글자수: z.number().int().describe('등록할 긴 댓글의 글자 수 — 1자 이상 300자 이하').default(300),
    넘는댓글글자수: z.number().int().describe('댓글 칸에 적어 볼 글자 수 — 301자 이상').default(301),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 짧은댓글 = 글자(params.짧은댓글글자수, '가');
  const 긴댓글 = 글자(params.긴댓글글자수, '나다라마바사아자차');
  let 글번호 = 0;

  try {
    await test.step('일회용 회원이 올린 내 글의 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(page.request);
      글번호 = 글.번호;
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 상세.댓글그려질때까지();
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('댓글이 하나도 없다', await 상세.댓글수읽기(), 0, { blocker: true });
    });

    await test.step('빈 댓글 칸으로 「등록」을 누른다', async () => {
      await 상세.새댓글등록.click();
      await 알림.글('댓글 내용을 입력하세요').waitFor();
      await verify('댓글 칸을 비우고 「등록」을 누르면 댓글이 늘지 않는다', await 상세.댓글수읽기(), 0);
    });

    await test.step('댓글 1자를 등록한다', async () => {
      await 상세.댓글쓰기(짧은댓글);
      await 상세.댓글수가될때까지(1);
      await verify('댓글 1자를 등록하면 댓글 목록에 그 댓글이 보인다', (await 상세.댓글본문들()).includes(짧은댓글), true);
    });

    await test.step('댓글 300자를 등록한다', async () => {
      await 상세.댓글쓰기(긴댓글);
      await 상세.댓글수가될때까지(2);
      await verify('댓글 300자를 등록하면 댓글 목록에 그 댓글이 보인다', (await 상세.댓글본문들()).includes(긴댓글), true);
    });

    await test.step('댓글 칸에 301자를 적는다', async () => {
      await 상세.새댓글칸.fill(글자(params.넘는댓글글자수));
      await verify('댓글 칸에 301자를 적으면 300자까지만 들어간다', (await 상세.새댓글칸.inputValue()).length, 300);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});

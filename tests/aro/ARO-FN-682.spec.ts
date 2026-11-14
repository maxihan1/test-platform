import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지지우기, 공지치우기, 새공지 } from './helpers/ops-api.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-682',
  name: '공지를 지우면 「기록」에 「공지」 · DELETE · 「공지 #<번호>」 · 「<제목>」 줄이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);
  const 머리글 = '[QA] ARO-FN-682 ';
  const 제목 = `${머리글}${String(Date.now())}`;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
    });

    await test.step('API 로 [QA] 공지를 지운 뒤 「기록」에서 그 제목으로 찾는다', async () => {
      const 번호 = await 새공지(page, { title: 제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: true });
      const 응답 = await 공지지우기(page, 번호);
      await verify('공지를 지우는 요청이 받아들여진다', 응답.status < 300, true, { blocker: true });
      await 화면.열기();
      await verify('「기록」 표에 줄이 보인다', (await 화면.줄들.count()) > 0, true, { blocker: true });
      await 화면.검색(제목);
      const 칸 = await 화면.칸글(화면.작업별줄('DELETE').first());
      const 앞칸 = await verify('그 줄의 메뉴 · 작업 · 대상이 「공지」 · DELETE · 「공지 #<번호>」 꼴이다', [칸[2], 칸[3], 칸[4]].join(' | '), `공지 | DELETE | 공지 #${String(번호)}`);
      const 내용 = await verify('그 줄의 내용이 「<제목>」이다', (칸[5] ?? '').trim(), 제목);
      await verify('공지를 지우면 「기록」에 「공지」 · DELETE · 「공지 #<번호>」 · 「<제목>」 줄이 보인다', 앞칸 && 내용, true);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지고치기, 공지치우기, 새공지 } from './helpers/ops-api.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-679',
  name: '공지를 만들면 「기록」에 「공지」 · CREATE · 「공지 #<번호>」 · 「<제목> · 켜짐」 줄이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);
  const 머리글 = '[QA] ARO-FN-679 ';
  const 제목 = `${머리글}${String(Date.now())}`;
  let 번호 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
    });

    await test.step('API 로 켜진 [QA] 공지를 만든 뒤 「기록」에서 그 제목으로 찾는다', async () => {
      번호 = await 새공지(page, { title: 제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: true });
      await 화면.열기();
      await verify('「기록」 표에 줄이 보인다', (await 화면.줄들.count()) > 0, true, { blocker: true });
      await 화면.검색(제목);
      const 칸 = await 화면.칸글(화면.작업별줄('CREATE').first());
      const 앞칸 = await verify('그 줄의 메뉴 · 작업 · 대상이 「공지」 · CREATE · 「공지 #<번호>」 꼴이다', [칸[2], 칸[3], 칸[4]].join(' | '), `공지 | CREATE | 공지 #${String(번호)}`);
      const 내용 = await verify('그 줄의 내용이 「<제목> · 켜짐」 꼴이다', (칸[5] ?? '').trim(), `${제목} · 켜짐`);
      await verify('공지를 만들면 「기록」에 「공지」 · CREATE · 「공지 #<번호>」 · 「<제목> · 켜짐」 줄이 보인다', 앞칸 && 내용, true);
    });

    await test.step('API 로 그 공지를 끈 뒤 「기록」에서 그 제목으로 찾는다', async () => {
      const 응답 = await 공지고치기(page, 번호, { title: 제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: false });
      await verify('공지를 끄는 요청이 받아들여진다', 응답.status < 300, true, { blocker: true });
      await 화면.열기();
      await 화면.검색(제목);
      const 칸 = await 화면.칸글(화면.작업별줄('UPDATE').first());
      await verify('끈 뒤 UPDATE 줄 내용은 「<제목> · 꺼짐」이다', (칸[5] ?? '').trim(), `${제목} · 꺼짐`);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});

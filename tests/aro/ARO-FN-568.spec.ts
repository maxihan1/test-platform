import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기, 새공지, 서버상태 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-568',
  name: '꺼진 공지를 만들면 /api/serverstatus notices 에 들어 있지 않다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    API서버: z.string().url().describe('게임 API 서버 주소 — 운영툴과 같은 서버를 쓰는 API 서버').default('https://bossroom-api.maxihan.com'),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 머리글 = '[QA] ARO-FN-568 ';
  const 꺼진제목 = `${머리글}${String(Date.now())} 꺼짐`;
  const 켜진제목 = `${머리글}${String(Date.now())} 켜짐`;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
    });

    await test.step('API 로 꺼진 [QA] 공지를 만들고 /api/serverstatus 를 읽는다', async () => {
      const 꺼진번호 = await 새공지(page, { title: 꺼진제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: false });
      const 켜진번호 = await 새공지(page, { title: 켜진제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: true });
      const 번호들 = (await 서버상태(request, params.API서버)).notices.map((n) => n.id);
      await verify('같이 만든 켜진 [QA] 공지는 /api/serverstatus notices 에 들어 있다', 번호들.includes(켜진번호), true, { blocker: true });
      await verify('꺼진 공지를 만들면 /api/serverstatus notices 에 들어 있지 않다', 번호들.includes(꺼진번호), false);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});

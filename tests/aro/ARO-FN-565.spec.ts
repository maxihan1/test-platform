import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 지금에서, 한시간 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기, 새공지, 서버상태 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-565',
  name: '게임에 보이는 공지를 만들면 /api/serverstatus notices 에 그 공지가 id · title · body · startsAt · endsAt 로 들어 있다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    API서버: z.string().url().describe('게임 API 서버 주소 — 운영툴과 같은 서버를 쓰는 API 서버').default('https://bossroom-api.maxihan.com'),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 머리글 = '[QA] ARO-FN-565 ';
  const 앞제목 = `${머리글}${String(Date.now())} 앞`;
  const 뒤제목 = `${머리글}${String(Date.now())} 뒤`;
  const 내용 = `${머리글}내용`;
  let 앞번호 = 0;
  let 뒤번호 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
    });

    await test.step('API 로 게임에 보이는 [QA] 공지를 만들고 /api/serverstatus 를 읽는다', async () => {
      앞번호 = await 새공지(page, { title: 앞제목, body: 내용, startsAt: 지금에서(-2 * 한시간), endsAt: null, enabled: true });
      const 상태 = await 서버상태(request, params.API서버);
      const 항목 = 상태.notices.find((n) => n.id === 앞번호);
      await verify('만든 [QA] 공지가 /api/serverstatus notices 에 들어 있다', 항목 !== undefined, true, { blocker: true });
      const 칸들 = await verify('그 공지에 id · title · body · startsAt · endsAt 가 들어 있다', Object.keys(항목 ?? {}).sort().join(', '), 'body, endsAt, id, startsAt, title');
      const 글 = await verify('그 공지의 title · body 가 만든 글과 같다', `${String(항목?.title)} | ${String(항목?.body)}`, `${앞제목} | ${내용}`);
      await verify('게임에 보이는 공지를 만들면 /api/serverstatus notices 에 그 공지가 id · title · body · startsAt · endsAt 로 들어 있다', 칸들 && 글, true);
    });

    await test.step('시작 시각이 다른 [QA] 공지 둘을 만들고 /api/serverstatus 를 읽는다', async () => {
      뒤번호 = await 새공지(page, { title: 뒤제목, body: 내용, startsAt: 지금에서(-한시간), endsAt: null, enabled: true });
      const 번호들 = (await 서버상태(request, params.API서버)).notices.map((n) => n.id);
      await verify('두 공지가 모두 /api/serverstatus notices 에 들어 있다', 번호들.includes(앞번호) && 번호들.includes(뒤번호), true, { blocker: true });
      await verify('notices 는 시작 시각이 최근인 공지가 앞에 온다', 번호들.indexOf(뒤번호) < 번호들.indexOf(앞번호), true);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});

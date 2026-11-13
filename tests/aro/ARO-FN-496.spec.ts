import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 제목으로공지찾기, 지금에서, 하루, 한시간, 화면시각 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기, 새공지 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-496',
  name: '끝을 정한 공지를 만들면 「기간」이 「<시작> ~ <끝>」으로 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-FN-496 ';
  const 끝있는제목 = `${머리글}${String(Date.now())} 끝있음`;
  const 끝없는제목 = `${머리글}${String(Date.now())} 끝없음`;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
    });

    await test.step('API 로 끝을 정한 [QA] 공지를 만들고 「공지」를 연다', async () => {
      await 새공지(page, { title: 끝있는제목, body: `${머리글}내용`, startsAt: 지금에서(-한시간), endsAt: 지금에서(하루), enabled: true });
      await 화면.열기();
      await verify('끝을 정한 [QA] 공지 줄이 공지 표에 보인다', await 화면.줄(끝있는제목).isVisible(), true, { blocker: true });
      const 저장된 = await 제목으로공지찾기(page, 끝있는제목);
      const 기간 = (await 화면.칸(끝있는제목, '기간').innerText()).replace(/\s+/g, ' ').trim();
      await verify('끝을 정한 공지를 만들면 「기간」이 「<시작> ~ <끝>」으로 보인다', 기간, `${화면시각(저장된?.startsAt ?? '')} ~ ${화면시각(저장된?.endsAt ?? '')}`);
    });

    await test.step('API 로 끝이 없는 [QA] 공지를 만들고 「공지」를 연다', async () => {
      await 새공지(page, { title: 끝없는제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: true });
      await 화면.열기();
      await verify('끝이 없는 [QA] 공지 줄이 공지 표에 보인다', await 화면.줄(끝없는제목).isVisible(), true, { blocker: true });
      const 저장된 = await 제목으로공지찾기(page, 끝없는제목);
      const 기간 = (await 화면.칸(끝없는제목, '기간').innerText()).replace(/\s+/g, ' ').trim();
      await verify('끝이 없는 공지는 「기간」의 끝 자리가 비어 있다', 기간, `${화면시각(저장된?.startsAt ?? '')} ~`);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});

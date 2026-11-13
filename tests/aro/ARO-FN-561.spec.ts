import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 제목으로공지찾기 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지고치기, 공지지우기, 공지치우기, 새공지 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-561',
  name: '지워진 공지를 API 로 고치면 「공지를 찾을 수 없습니다」가 온다',
  precondition: ['지워진 [QA] 공지가 있다', '[QA] 공지가 보이는 공지 표를 열어 두었다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-FN-561 ';
  const 지울제목 = `${머리글}${String(Date.now())} 지움`;
  const 남길제목 = `${머리글}${String(Date.now())} 남김`;
  let 지운번호 = 0;
  let 남긴번호 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
    });

    await test.step('API 로 [QA] 공지 둘을 만들어 하나를 지우고 「공지」를 연다', async () => {
      지운번호 = await 새공지(page, { title: 지울제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: true });
      남긴번호 = await 새공지(page, { title: 남길제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: true });
      await 공지지우기(page, 지운번호);
      await verify('지워진 [QA] 공지가 있다', await 제목으로공지찾기(page, 지울제목), undefined, { blocker: true });
      await 화면.열기();
      await verify('[QA] 공지가 보이는 공지 표를 열어 두었다', await 화면.줄(남길제목).isVisible(), true, { blocker: true });
    });

    await test.step('API 로 그 공지를 고친다', async () => {
      const 응답 = await 공지고치기(page, 지운번호, { title: 지울제목, body: `${머리글}고침`, startsAt: null, endsAt: null, enabled: true });
      await verify('지워진 공지를 API 로 고치면 「공지를 찾을 수 없습니다」가 온다', 응답.body.message, '공지를 찾을 수 없습니다');
    });

    await test.step('API 로 그 공지를 지운 뒤 화면에서 「켜기」를 끈다', async () => {
      await 공지지우기(page, 남긴번호);
      await 화면.켜기스위치(남길제목).click();
      const 떴다 = await 화면.알림.뜰때까지('공지를 찾을 수 없습니다');
      await verify('이미 지워진 공지의 「켜기」 끄기는 토스트 「공지를 찾을 수 없습니다」를 띄운다', 떴다, true);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});

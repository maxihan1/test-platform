import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 제목으로공지찾기, 지금에서, 하루, 화면시각 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기, 새공지 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-547',
  name: '시작이 내일인 공지를 고치며 시작을 비우면 「기간」 시작이 지금으로 바뀐다',
  precondition: ['시작이 내일인 [QA] 공지가 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-FN-547 ';
  const 제목 = `${머리글}${String(Date.now())}`;
  const 내일 = 지금에서(하루);

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
    });

    await test.step('API 로 시작이 내일인 [QA] 공지를 만들고 「공지」를 연다', async () => {
      await 새공지(page, { title: 제목, body: `${머리글}내용`, startsAt: 내일, endsAt: null, enabled: true });
      await 화면.열기();
      const 기간 = (await 화면.칸(제목, '기간').innerText()).replace(/\s+/g, ' ').trim();
      await verify('[QA] 공지의 「기간」 시작이 내일이다', 기간.split(' ~')[0], 화면시각(내일), { blocker: true });
    });

    await test.step('그 공지를 고치며 시작을 비우고 저장한다', async () => {
      await 화면.고치기버튼(제목).click();
      const 열렸다 = await 화면.창.열릴때까지();
      await verify('「공지 고치기」 창이 열린다', 열렸다, true, { blocker: true });
      await 화면.적기({ 시작: '' });
      await 화면.저장누르기();
      await 화면.알림.뜰때까지('공지를 저장했습니다');
      const 바뀜 = await 화면.칸(제목, '기간').filter({ hasNotText: 화면시각(내일) }).waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('고친 [QA] 공지의 「기간」이 다시 그려진다', 바뀜, true, { blocker: true });
      const 저장된 = await 제목으로공지찾기(page, 제목);
      const 기간 = (await 화면.칸(제목, '기간').innerText()).replace(/\s+/g, ' ').trim();
      await verify('시작이 내일인 공지를 고치며 시작을 비우면 「기간」 시작이 지금으로 바뀐다', 기간.split(' ~')[0], 화면시각(저장된?.updatedAt ?? ''));
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});

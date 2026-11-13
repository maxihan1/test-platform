import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 제목으로공지찾기, 제목으로공지치우기 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 글자, 공지저장, 공지치우기 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-533',
  name: '공지 제목에 공백만 적고 저장하면 토스트 「공지 제목을 1~60자로 입력하세요」가 뜬다',
  techniques: ['경계값 분석'],
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-FN-533 ';
  const 한글자제목 = '힣';
  const 예순자제목 = `${머리글}${글자(60 - 머리글.length, '나')}`;
  const 예순한자제목 = `${머리글}${글자(61 - 머리글.length, '나')}`;
  const 내용 = `${머리글}내용`;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운 뒤 「공지」 화면을 연다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
      await 제목으로공지치우기(page, 한글자제목);
      await 화면.열기();
      await verify('「새 공지」 버튼이 보인다', await 화면.새공지버튼.isVisible(), true, { blocker: true });
    });

    await test.step('공지 제목에 공백만 적고 「저장」을 누른다', async () => {
      const 열렸다 = await 화면.새공지열기();
      await verify('「새 공지」 창이 열린다', 열렸다, true, { blocker: true });
      await 화면.적기({ 제목: '   ', 내용 });
      await 화면.저장누르기();
      const 떴다 = await 화면.알림.뜰때까지('공지 제목을 1~60자로 입력하세요');
      await verify('공지 제목에 공백만 적고 저장하면 토스트 「공지 제목을 1~60자로 입력하세요」가 뜬다', 떴다, true);
    });

    await test.step('공지 제목 1자로 저장한다', async () => {
      const 열렸다 = await 화면.새공지열기();
      await verify('「새 공지」 창이 열린다', 열렸다, true, { blocker: true });
      await 화면.적기({ 제목: 한글자제목, 내용 });
      await 화면.저장누르기();
      await 화면.줄(한글자제목).waitFor({ timeout: 10_000 }).catch(() => undefined);
      await verify('공지 제목 1자는 저장된다', (await 제목으로공지찾기(page, 한글자제목))?.title, 한글자제목);
    });

    await test.step('공지 제목 60자로 저장한다', async () => {
      const 열렸다 = await 화면.새공지열기();
      await verify('「새 공지」 창이 열린다', 열렸다, true, { blocker: true });
      await 화면.적기({ 제목: 예순자제목, 내용 });
      await 화면.저장누르기();
      await 화면.줄(예순자제목).waitFor({ timeout: 10_000 }).catch(() => undefined);
      await verify('공지 제목 60자는 저장된다', (await 제목으로공지찾기(page, 예순자제목))?.title, 예순자제목);
    });

    await test.step('API 로 공지 제목 61자를 보낸다', async () => {
      const 응답 = await 공지저장(page, { title: 예순한자제목, body: 내용, startsAt: null, endsAt: null, enabled: true });
      await verify('공지 제목 61자는 「공지 제목을 1~60자로 입력하세요」로 거절된다', 응답.body.message, '공지 제목을 1~60자로 입력하세요');
    });
  } finally {
    await 공지치우기(page, 머리글);
    await 제목으로공지치우기(page, 한글자제목);
  }
});

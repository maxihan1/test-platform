import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 입력칸시각, 하루 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-543',
  name: '공지 끝을 시작과 같게 정해 저장하면 토스트 「끝나는 시각은 시작보다 뒤여야 합니다」가 뜬다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-FN-543 ';
  const 같은시각 = 입력칸시각(Date.now() + 하루);
  const 앞선시각 = 입력칸시각(Date.now());

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운 뒤 「공지」 화면을 연다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
      await 화면.열기();
      await verify('「새 공지」 버튼이 보인다', await 화면.새공지버튼.isVisible(), true, { blocker: true });
    });

    await test.step('공지 끝을 시작과 같게 정해 저장한다', async () => {
      const 열렸다 = await 화면.새공지열기();
      await verify('「새 공지」 창이 열린다', 열렸다, true, { blocker: true });
      await 화면.적기({ 제목: `${머리글}${String(Date.now())} 같음`, 내용: `${머리글}내용`, 시작: 같은시각, 끝: 같은시각 });
      await 화면.저장누르기();
      const 떴다 = await 화면.알림.뜰때까지('끝나는 시각은 시작보다 뒤여야 합니다');
      await verify('공지 끝을 시작과 같게 정해 저장하면 토스트 「끝나는 시각은 시작보다 뒤여야 합니다」가 뜬다', 떴다, true);
    });

    await test.step('공지 끝을 시작보다 앞으로 정해 저장한다', async () => {
      const 열렸다 = await 화면.새공지열기();
      await verify('「새 공지」 창이 열린다', 열렸다, true, { blocker: true });
      await 화면.적기({ 제목: `${머리글}${String(Date.now())} 앞섬`, 내용: `${머리글}내용`, 시작: 같은시각, 끝: 앞선시각 });
      await 화면.저장누르기();
      const 떴다 = await 화면.알림.뜰때까지('끝나는 시각은 시작보다 뒤여야 합니다');
      await verify('공지 끝이 시작보다 앞이어도 토스트 「끝나는 시각은 시작보다 뒤여야 합니다」가 뜬다', 떴다, true);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});

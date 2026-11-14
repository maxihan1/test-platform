import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-043',
  name: '공지를 저장하면 화면 아래 토스트 「공지를 저장했습니다」가 뜨고 10초 안에 사라진다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-FN-043 ';
  const 제목 = `${머리글}${String(Date.now())}`;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운 뒤 「공지」 화면을 연다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
      await 화면.열기();
      await verify('「새 공지」 버튼이 보인다', await 화면.새공지버튼.isVisible(), true, { blocker: true });
    });

    await test.step('[QA] 공지를 적어 「저장」을 누른다', async () => {
      const 열렸다 = await 화면.새공지열기();
      await verify('「새 공지」 창이 열린다', 열렸다, true, { blocker: true });
      await 화면.적기({ 제목, 내용: `${머리글}내용` });
      await 화면.저장누르기();
      const 떴다 = await 화면.알림.뜰때까지('공지를 저장했습니다');
      const 상자 = await 화면.알림.글('공지를 저장했습니다').first().boundingBox();
      const 높이 = page.viewportSize()?.height ?? 0;
      const 아래다 = await verify('토스트가 화면 아래쪽에 뜬다', 상자 !== null && 상자.y + 상자.height / 2 > 높이 / 2, true);
      const 사라졌다 = await 화면.알림.글('공지를 저장했습니다').first().waitFor({ state: 'hidden', timeout: 10_000 }).then(() => true, () => false);
      const 떴고 = await verify('토스트 「공지를 저장했습니다」가 뜬다', 떴다, true);
      const 사라짐 = await verify('토스트가 10초 안에 사라진다', 사라졌다, true);
      await verify('공지를 저장하면 화면 아래 토스트 「공지를 저장했습니다」가 뜨고 10초 안에 사라진다', 떴고 && 아래다 && 사라짐, true);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새스폰아이디, 스폰지우기 } from './helpers/admin-api.helper.js';
import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-FN-127',
  name: '「스폰 추가·수정」에 새 ID 와 구역 · 몬스터 · x · z 를 넣고 「저장」을 누르면 스폰 목록에 그 ID 줄이 보인다',
  precondition: ['맞는 키를 저장했다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 백오피스화면(page);
  const 키 = params.password ?? '';
  const 아이디 = 새스폰아이디();

  await test.step('백오피스를 열고 맞는 키를 저장한다', async () => {
    await 화면.열기();
    const 응답 = await 화면.키저장하고목록기다리기(키);
    await verify('키 저장 뒤 캐릭터 검색 응답이 성공이다', 응답.ok(), true, { blocker: true });
  });

  await test.step('「스폰」 탭을 연다', async () => {
    await 화면.스폰탭열기();
    await verify('스폰 목록에 새 ID 줄이 아직 없다', await 화면.스폰줄(아이디).count(), 0, { blocker: true });
  });

  try {
    await test.step('새 ID 와 Beginner · Imp · 초보 구역 좌표를 넣고 「저장」을 누른다', async () => {
      await 화면.스폰저장(아이디, 'Beginner', 'Imp', '35', '104');
      await verify('「스폰 추가·수정」에 새 ID 와 구역 · 몬스터 · x · z 를 넣고 「저장」을 누르면 스폰 목록에 그 ID 줄이 보인다', await 화면.스폰줄(아이디).count(), 1);
    });
  } finally {
    await 스폰지우기(page, 키, 아이디);
  }
});

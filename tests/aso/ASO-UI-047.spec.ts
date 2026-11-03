import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-UI-047',
  name: '스폰 탭 버튼 반응',
  precondition: ['스폰 탭을 열었다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    복원확인문구: z.string().describe('기본값 복원 확인 창 문구').default('스폰 표를 기본값으로 되돌릴까요?'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 백오피스화면(page);
  const 키 = params.password ?? '';

  await test.step('백오피스를 열고 맞는 키를 저장한다', async () => {
    await 화면.열기();
    const 응답 = await 화면.키저장하고목록기다리기(키);
    await verify('키 저장 뒤 캐릭터 검색 응답이 성공이다', 응답.ok(), true, { blocker: true });
  });

  await test.step('「스폰」 탭을 연다', async () => {
    await 화면.스폰탭열기();
    await verify('스폰 목록에 줄이 보인다', (await 화면.스폰줄들.count()) > 0, true, { blocker: true });
  });

  await test.step('목록 첫 줄의 「수정」을 누른다', async () => {
    const 줄 = 화면.스폰줄들.filter({ hasNotText: /^ASO/ }).first();
    const [아이디 = '', 구역 = '', 몬스터 = '', x = '', z좌표 = ''] = await 화면.줄칸글(줄);
    await 줄.getByRole('button', { name: '수정' }).click();
    const [칸아이디, 칸구역, 칸몬스터, 칸x, 칸z] = await 화면.스폰칸값들();
    const 가 = await verify('ID 칸에 그 줄의 ID 가 들어 있다', 칸아이디, 아이디);
    const 나 = await verify('구역 칸에 그 줄의 구역이 들어 있다', 칸구역, 구역);
    const 다 = await verify('몬스터 칸에 그 줄의 몬스터가 들어 있다', 칸몬스터, 몬스터);
    const 라 = await verify('x 칸에 그 줄의 x 가 들어 있다', Number(칸x).toFixed(1), x);
    const 마 = await verify('z 칸에 그 줄의 z 가 들어 있다', Number(칸z).toFixed(1), z좌표);
    await verify('스폰 탭에서 「수정」을 누르면 위 칸에 그 줄의 ID · 구역 · 몬스터 · x · z 가 채워진다', 가 && 나 && 다 && 라 && 마, true);
  });

  await test.step('「기본값 복원」을 누르고 확인 창은 취소한다', async () => {
    const 문구 = await 화면.확인창문구받고취소(화면.기본값복원버튼);
    await verify('스폰 탭에서 「기본값 복원」을 누르면 확인 창 「스폰 표를 기본값으로 되돌릴까요?」가 뜬다', 문구, expected.복원확인문구);
  });
});

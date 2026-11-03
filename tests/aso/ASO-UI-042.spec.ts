import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-UI-042',
  name: '캐릭터 상세에 「값 바꾸기」의 골드 · 레벨 · 성향 · 위치 칸이 빈 채로 보인다',
  precondition: ['캐릭터 상세를 열었다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 백오피스화면(page);

  await test.step('백오피스를 열고 맞는 키를 저장한다', async () => {
    await 화면.열기();
    const 응답 = await 화면.키저장하고목록기다리기(params.password ?? '');
    await verify('키 저장 뒤 캐릭터 검색 응답이 성공이다', 응답.ok(), true, { blocker: true });
  });

  await test.step('목록 첫 캐릭터의 상세를 연다', async () => {
    await 화면.캐릭터열기(화면.캐릭터줄들.first());
    await verify('캐릭터 상세 표가 보인다', await 화면.상세표줄들.first().isVisible(), true, { blocker: true });
  });

  await test.step('「값 바꾸기」를 본다', async () => {
    const 골드 = await verify('골드 칸이 비어 있다', await 화면.골드칸.inputValue(), '');
    const 레벨 = await verify('레벨 칸이 비어 있다', await 화면.레벨칸.inputValue(), '');
    const 성향 = await verify('성향 칸이 비어 있다', await 화면.성향칸.inputValue(), '');
    const x = await verify('위치 x 칸이 비어 있다', await 화면.위치x칸.inputValue(), '');
    const z좌표 = await verify('위치 z 칸이 비어 있다', await 화면.위치z칸.inputValue(), '');
    await verify('캐릭터 상세에 「값 바꾸기」의 골드 · 레벨 · 성향 · 위치 칸이 빈 채로 보인다', 골드 && 레벨 && 성향 && x && z좌표, true);
  });

  await test.step('「보라 해제」를 본다', async () => {
    await verify('캐릭터 상세에 「보라 해제」가 꺼진 채로 보인다', await 화면.보라해제.isChecked(), false);
  });
});

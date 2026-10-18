import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 세션회원있는가 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-392',
  name: '게시글 목록 요청에 category 를 주면 그 분류 글만 준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    분류: z.string().min(1).describe('게시글 분류 — 자유, 질문, 후기 중 하나').default('질문'),
    작성자검색어: z.string().min(2).describe('작성자 검색어 — 2자 이상, 작성자 이름에 든 글자').default('김데'),
  }),
  expected: null,
});

type 글 = { category: string; author: string; views: number };

test(spec, async ({ request, params }) => {
  await test.step('비회원 상태를 확인한다', async () => {
    await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
  });

  await test.step('GET /api/posts?category=질문 을 부른다', async () => {
    const 응답 = await request.get('/api/posts', { params: { category: params.분류 } });
    const 글들 = ((await 응답.json()) as { items: 글[] }).items;
    await verify(
      '게시글 목록 요청에 category 를 주면 그 분류 글만 준다',
      { 하나이상: 글들.length > 0, 모두그분류: 글들.every((한글) => 한글.category === params.분류) },
      { 하나이상: true, 모두그분류: true },
    );
  });

  await test.step('field=author 와 q 로 게시글 목록을 부른다', async () => {
    const 응답 = await request.get('/api/posts', { params: { field: 'author', q: params.작성자검색어 } });
    const 글들 = ((await 응답.json()) as { items: 글[] }).items;
    await verify(
      '게시글 목록 요청에 field=author 와 q 를 주면 작성자에 그 글자가 든 글만 준다',
      { 하나이상: 글들.length > 0, 모두작성자에든글자: 글들.every((한글) => 한글.author.includes(params.작성자검색어)) },
      { 하나이상: true, 모두작성자에든글자: true },
    );
  });

  await test.step('sort=views 로 게시글 목록을 부른다', async () => {
    const 응답 = await request.get('/api/posts', { params: { sort: 'views' } });
    const 조회수들 = ((await 응답.json()) as { items: 글[] }).items.map((한글) => 한글.views);
    await verify(
      '게시글 목록 요청에 sort=views 를 주면 조회수 많은 순으로 준다',
      { 두건이상: 조회수들.length >= 2, 많은순: 조회수들.every((수, i) => i === 0 || (조회수들[i - 1] ?? 0) >= 수) },
      { 두건이상: true, 많은순: true },
    );
  });
});

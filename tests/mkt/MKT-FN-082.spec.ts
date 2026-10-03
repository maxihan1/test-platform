import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-082',
  name: '글 목록 API 는 page · size · 분류 · 검색 · 정렬을 받고 상세 호출마다 조회수를 올린다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({
    category: z.string().min(1).describe('거를 분류').default('질문'),
    keyword: z.string().min(1).describe('제목 검색어').default('사이즈'),
    postId: z.number().describe('조회수를 볼 글 번호').default(30),
  }),
  expected: z.object({
    shape: z.string().describe('목록 응답의 칸 모양과 page 와 size').default('true, number, 2, 5'),
    sorted: z.string().describe('조회순 · 좋아요순 · 최신순이 내림차순인지').default('true, true, true'),
    viewIncrease: z.number().describe('호출마다 늘어나는 조회수').default(1),
  }),
});

type 목록응답 = { items: { id: number; category: string; title: string; views: number; likes: number; createdAt: number }[]; total: number; page: number; size: number };

test(spec, async ({ request, params, expected }) => {
  const 읽는다 = async (쿼리: string): Promise<목록응답> => (await (await request.get(`/api/posts?${쿼리}`)).json()) as 목록응답;
  const 내림차순 = (값들: number[]): boolean => 값들.length > 1 && 값들.every((n, i) => i === 0 || 값들[i - 1] >= n);

  await test.step('GET /api/posts?page=2&size=5 를 부른다', async () => {
    const 응답 = await 읽는다('page=2&size=5');
    await verify(
      '목록 조회는 page · size 를 받고 {"items":[...],"total":N,"page":N,"size":N} 로 응답한다',
      [Array.isArray(응답.items), typeof 응답.total, 응답.page, 응답.size].join(', '),
      expected.shape,
    );
  });

  await test.step('GET /api/posts 를 category · field · q · sort 를 바꿔 부른다', async () => {
    const 응답 = await 읽는다(`category=${encodeURIComponent(params.category)}`);
    await verify('GET /api/posts 는 category 로 분류를 거른다', 응답.items.length > 0 && 응답.items.every((글) => 글.category === params.category), true);
  });

  await test.step('GET /api/posts 를 field 와 q 로 부른다', async () => {
    const 응답 = await 읽는다(`field=title&q=${encodeURIComponent(params.keyword)}`);
    await verify('GET /api/posts 는 field 와 q 로 검색한다', 응답.items.length > 0 && 응답.items.every((글) => 글.title.includes(params.keyword)), true);
  });

  await test.step('GET /api/posts 를 sort 로 부른다', async () => {
    const 조회순 = await 읽는다('sort=views');
    const 좋아요순 = await 읽는다('sort=likes');
    const 최신순 = await 읽는다('sort=latest');
    await verify(
      'GET /api/posts 는 sort 로 latest · views · likes 순서를 바꾼다',
      [내림차순(조회순.items.map((글) => 글.views)), 내림차순(좋아요순.items.map((글) => 글.likes)), 내림차순(최신순.items.map((글) => 글.createdAt))].join(', '),
      expected.sorted,
    );
  });

  await test.step('GET /api/posts/{id} 를 두 번 부른다', async () => {
    const 첫째 = (await (await request.get(`/api/posts/${params.postId}`)).json()) as { views: number };
    const 둘째 = (await (await request.get(`/api/posts/${params.postId}`)).json()) as { views: number };
    await verify('GET /api/posts/{id} 는 호출마다 조회수를 1 올린다', 둘째.views - 첫째.views, expected.viewIncrease);
  });
});

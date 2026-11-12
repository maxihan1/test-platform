import type { APIRequestContext } from '@playwright/test';

export async function 게시자번호(admin: APIRequestContext, 도메인: string): Promise<string> {
  const 응답 = await admin.get('/api/v1/admin/trends/links/publishers');
  if (응답.status() !== 200) return '';
  const 줄들 = (await 응답.json()) as { id?: string | number; domain?: string }[];
  const 찾은 = 줄들.find((줄) => 줄.domain === 도메인)?.id;
  return 찾은 === undefined ? '' : String(찾은);
}

import type { APIRequestContext } from '@playwright/test';

export const 잘못된토큰 = 'mti-wrong-token-0000000000';
export const 없는번호 = '999999999';

export interface 앱정보 {
  id: string;
  client_id: string;
  client_secret: string;
}

export function 머리(토큰: string): Record<string, string> {
  return { Authorization: `Bearer ${토큰}` };
}

export function 고유이름(앞: string): string {
  return `${앞}${Date.now().toString(36)}${Math.floor(Math.random() * 1_000_000).toString(36)}`;
}

export async function 앱만들기(request: APIRequestContext, 범위 = 'read write'): Promise<앱정보> {
  const 응답 = await request.post('/api/v1/apps', {
    data: { client_name: 'MTI 시험 앱', redirect_uris: 'urn:ietf:wg:oauth:2.0:oob', scopes: 범위 },
  });
  const 몸 = (await 응답.json()) as Partial<앱정보>;
  return { id: 몸.id ?? '', client_id: 몸.client_id ?? '', client_secret: 몸.client_secret ?? '' };
}

export async function 앱토큰받기(request: APIRequestContext, 앱: 앱정보, 범위 = 'read write'): Promise<string> {
  const 응답 = await request.post('/oauth/token', {
    data: { grant_type: 'client_credentials', client_id: 앱.client_id, client_secret: 앱.client_secret, scope: 범위 },
  });
  const 몸 = (await 응답.json()) as { access_token?: string };
  return 몸.access_token ?? '';
}

export async function 토큰폐기(request: APIRequestContext, 앱: 앱정보, 토큰: string): Promise<number> {
  const 응답 = await request.post('/oauth/revoke', {
    data: { client_id: 앱.client_id, client_secret: 앱.client_secret, token: 토큰 },
  });
  return 응답.status();
}

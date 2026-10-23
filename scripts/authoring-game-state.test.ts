// 작성 중 상태 도우미 부르기 검사 — 몸통 admin 과 같은 머리로 부르고 결과 · 오류에서 키를 가린다 (도메인/게임 §3.10 「작성 — 한 바퀴」 4)
import { createServer, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { 결과글, 도우미자리, 실행 } from './authoring-game-state.js';

const 키 = { header: 'X-Admin-Key', value: 'game-admin-key-plain-456' };
const 도우미 = `
export async function 골드주기(admin, 캐릭터, 양) {
  const res = await admin.post('/admin/gold', { data: { 캐릭터, 양 } });
  if (!res.ok()) throw new Error(\`골드 주기 실패: \${String(res.status())} \${await res.text()}\`);
  return res.json();
}
export async function 키되비침(admin) {
  const res = await admin.get('/admin/echo');
  throw new Error(\`되비침: \${await res.text()}\`);
}
export const 숫자 = 3;
`;

let 서버: Server;
let 주소 = '';
let 받은머리: string | undefined;
let 자리들: string[] = [];

beforeAll(async () => {
  서버 = createServer((req, res) => {
    받은머리 = req.headers['x-admin-key'] as string | undefined;
    let 몸 = '';
    req.on('data', (c: Buffer) => (몸 += c.toString()));
    req.on('end', () => {
      if (req.url === '/admin/echo') return void res.end(String(받은머리));
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, 받음: JSON.parse(몸 || 'null') as unknown }));
    });
  });
  await new Promise<void>((풀림) => 서버.listen(0, '127.0.0.1', 풀림));
  const 자리 = 서버.address();
  주소 = typeof 자리 === 'object' && 자리 !== null ? `http://127.0.0.1:${자리.port}` : '';
});

afterAll(async () => {
  await new Promise((풀림) => 서버.close(풀림));
});

afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
  vi.restoreAllMocks();
});

function 트리(): string {
  const t = mkdtempSync(join(tmpdir(), 'game-state-'));
  자리들.push(t);
  mkdirSync(join(t, 'tests', 'g', 'helpers'), { recursive: true });
  writeFileSync(join(t, 'tests', 'g', 'helpers', 'game-state.helper.ts'), 도우미);
  return t;
}

const 환경 = () => ({ PLATFORM_BASE_URL: 주소, PLATFORM_ADMIN_KEY: JSON.stringify(키) });

describe('실행 — 도우미 함수 하나를 어드민 키 머리로 부른다', () => {
  it('케이스의 몸통 admin 처럼 키 머리를 붙여 부르고 돌려준 값을 찍는다', async () => {
    const 찍힘 = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await 실행(['g', '골드주기', '["qacrawl-1", 1000]'], 트리(), 환경())).toBe(0);
    expect(받은머리).toBe(키.value);
    expect(찍힘.mock.calls[0]?.[0]).toContain('"양": 1000');
  });

  it('도우미가 던지면 1 — 오류 글에 키 값이 섞여도 가린다', async () => {
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await 실행(['g', '키되비침'], 트리(), 환경())).toBe(1);
    expect(오류.mock.calls[0]?.[0]).toContain('되비침: ••••••');
    expect(오류.mock.calls[0]?.[0]).not.toContain(키.value);
  });

  it('키가 없거나 함수가 아니거나 인자가 배열이 아니면 부르지 않고 2', async () => {
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {});
    받은머리 = undefined;
    expect(await 실행(['g', '골드주기'], 트리(), { PLATFORM_BASE_URL: 주소 })).toBe(2);
    expect(오류.mock.calls.at(-1)?.[0]).toMatch(/어드민 키가 없다/);
    expect(await 실행(['g', '숫자'], 트리(), 환경())).toBe(2);
    expect(오류.mock.calls.at(-1)?.[0]).toMatch(/있는 것: 골드주기 · 키되비침/);
    expect(await 실행(['g', '골드주기', '{"양":1}'], 트리(), 환경())).toBe(2);
    expect(await 실행(['없는폴더', '골드주기'], 트리(), 환경())).toBe(2);
    expect(받은머리).toBeUndefined();
  });
});

describe('도우미자리 · 결과글', () => {
  it('도우미가 링크면 안 부른다 — 트리 밖 코드를 돌리지 않게', () => {
    const t = 트리();
    const 밖 = mkdtempSync(join(tmpdir(), 'game-state-밖-'));
    자리들.push(밖);
    writeFileSync(join(밖, 'x.ts'), 도우미);
    rmSync(join(t, 'tests', 'g', 'helpers', 'game-state.helper.ts'));
    symlinkSync(join(밖, 'x.ts'), join(t, 'tests', 'g', 'helpers', 'game-state.helper.ts'));
    expect(도우미자리(t, 'g')).toBeNull();
    expect(도우미자리(t, '../g')).toBeNull();
  });

  it('키 · 계정 값을 가리고 상한에서 자른다', () => {
    expect(결과글({ key: 키.value }, [키.value])).toBe('{\n  "key": "••••••"\n}');
    expect(결과글('가'.repeat(9_000), [])).toMatch(/1002자 더 있다/);
    expect(결과글(undefined, [])).toBe('(돌려준 값 없음)');
  });
});

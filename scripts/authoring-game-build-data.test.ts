// 게임 빌드 데이터 꺼내기 검사 — 링크 바꾸기 · 스트림 받기 상한 · 파이썬 끝 코드 · 캐시 열쇠 · 작업 바탕 캐시 · 파이썬 풀기 안전장치(자체 검사) (게임 정보 먼저 쌓기)
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import JSZip from 'jszip';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { 게임자리 } from './authoring-game.js';
import { 게임빌드데이터꺼내기, 받을주소, 빌드열쇠, 캐시맞나, 캐시자리만들기 } from './authoring-game-build-data.js';

const 링크 = 'https://qa.example.com/api/builds/6889/apk?exp=1790000000&sig=abc';
const 시스템파이썬 = '/usr/bin/python3';
const 스크립트 = join(import.meta.dirname, 'authoring-game-build-data.py');
const 지울곳: string[] = [];
afterEach(() => {
  for (const d of 지울곳.splice(0)) rmSync(d, { recursive: true, force: true });
});
const 새폴더 = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'game-build-data-'));
  지울곳.push(d);
  return d;
};

async function 압축(항목: Record<string, string>): Promise<Uint8Array<ArrayBuffer>> {
  const zip = new JSZip();
  for (const [이름, 글] of Object.entries(항목)) zip.file(이름, 글);
  return zip.generateAsync({ type: 'uint8array' }) as Promise<Uint8Array<ArrayBuffer>>;
}

describe('받을주소 · 빌드열쇠', () => {
  it('서명 링크의 앞만 admin 주소로 바꾸고 뒤(경로 · 서명)는 그대로 둔다', () => {
    expect(받을주소(링크, 'http://admin:3000')).toBe('http://admin:3000/api/builds/6889/apk?exp=1790000000&sig=abc');
    expect(받을주소(링크, 'http://admin:3000/')).toBe('http://admin:3000/api/builds/6889/apk?exp=1790000000&sig=abc');
    expect(받을주소('https://qa.example.com/qahub/api/builds/7/apk?exp=1&sig=a', 'http://admin:3000')).toBe('http://admin:3000/api/builds/7/apk?exp=1&sig=a');
  });

  it('빌드 링크가 아니면 null — 앱 파일 경로는 받지 않는다', () => {
    expect(받을주소('/data/app.apk', 'http://admin:3000')).toBeNull();
    expect(빌드열쇠('/data/app.apk')).toBeNull();
    expect(빌드열쇠(링크)).toBe('6889');
  });

  it('캐시 자리는 접두사가 경로로 쓸 수 있는 글자일 때만 만든다', () => {
    expect(캐시자리만들기('/work', 'MTI')).toBe('/work/game-build-data/MTI');
    expect(캐시자리만들기('/work', '../x')).toBeUndefined();
    expect(캐시자리만들기('/work', '')).toBeUndefined();
  });
});

describe('파이썬 풀기 안전장치', () => {
  it.skipIf(!existsSync(시스템파이썬))('순수 함수 자체 검사가 -I 로 통과한다 — 풀계획 · zip slip · 압축 폭탄 · .dll 이름', () => {
    const r = spawnSync(시스템파이썬, ['-I', 스크립트, '--self-check'], { encoding: 'utf8' });
    expect(r.stderr).toBe('');
    expect(r.stdout).toContain('자체 검사 통과');
    expect(r.status).toBe(0);
  });
});

describe('게임빌드데이터꺼내기', () => {
  const 입력 = (자료: string, 더: Partial<Parameters<typeof 게임빌드데이터꺼내기>[0]> = {}) => {
    const 알림: string[] = [];
    return { 알림, 입력: { 자료, 임시: 새폴더(), 집: 새폴더(), 관리주소: 'http://admin:3000', 자식: null, 알린다: (글: string) => 알림.push(글), ...더 } };
  };
  const 링크쓰기 = (자료: string): void => writeFileSync(join(자료, 'app-link.txt'), 링크);
  const 가짜파이썬 = (본문: string): string => {
    const 파일 = join(새폴더(), 'python3');
    writeFileSync(파일, `#!/bin/sh\n${본문}\n`);
    chmodSync(파일, 0o755);
    return 파일;
  };
  const 응답 = (몸: Uint8Array<ArrayBuffer>) => async () => new Response(몸);

  it('앱 링크가 없거나 빌드 링크가 아니면 받지 않고 건너뛴다', async () => {
    const 자료 = 새폴더();
    const 받는것 = vi.fn();
    const 첫 = 입력(자료, { 받는것: 받는것 as unknown as typeof fetch });
    await 게임빌드데이터꺼내기(첫.입력);
    writeFileSync(join(자료, 'app-link.txt'), '/data/app.apk');
    await 게임빌드데이터꺼내기(첫.입력);
    expect(받는것).not.toHaveBeenCalled();
    expect(첫.알림).toHaveLength(2);
  });

  it('같은 빌드 열쇠가 있으면 다시 받지 않는다', async () => {
    const 자료 = 새폴더();
    링크쓰기(자료);
    writeFileSync(join(자료, 게임자리.빌드열쇠), '6889\n');
    expect(캐시맞나(자료, '6889')).toBe(true);
    expect(캐시맞나(자료, '6890')).toBe(false);
    const 받는것 = vi.fn();
    const { 알림, 입력: 값 } = 입력(자료, { 받는것: 받는것 as unknown as typeof fetch });
    await 게임빌드데이터꺼내기(값);
    expect(받는것).not.toHaveBeenCalled();
    expect(알림[0]).toContain('그대로');
  });

  it('파이썬이 없으면 건너뛰고 앞 빌드의 낡은 값은 지운다', async () => {
    const 자료 = 새폴더();
    링크쓰기(자료);
    writeFileSync(join(자료, 게임자리.빌드열쇠), '6800');
    writeFileSync(join(자료, 게임자리.종류표), '낡은 것');
    writeFileSync(join(자료, 게임자리.빌드데이터), '{}');
    const 받는것 = vi.fn();
    const { 알림, 입력: 값 } = 입력(자료, { 파이썬: join(자료, '없는-python'), 받는것: 받는것 as unknown as typeof fetch });
    await 게임빌드데이터꺼내기(값);
    expect(받는것).not.toHaveBeenCalled();
    expect(알림[0]).toContain('안 꺼낸다');
    for (const 이름 of [게임자리.빌드열쇠, 게임자리.종류표, 게임자리.빌드데이터]) expect(existsSync(join(자료, 이름))).toBe(false);
  });

  it('파이썬이 잘 끝나면 zip 파일 · 풀 폴더 · 자료 폴더를 넘기고 열쇠를 남기고 받은 zip 과 풀어 놓은 것을 지운다', async () => {
    const 자료 = 새폴더();
    링크쓰기(자료);
    const 가짜 = 가짜파이썬('echo "$1" > "$5/args.txt"; ls -l "$3" | wc -l >> "$5/args.txt"; echo "$4" >> "$5/args.txt"; echo "타입 3 묶음 종류 2"');
    const { 알림, 입력: 값 } = 입력(자료, { 파이썬: 가짜, 받는것: 응답(await 압축({ 'G_Data/Managed/A.dll': 'x', 'G_Data/level0': 'y' })) as unknown as typeof fetch });
    await 게임빌드데이터꺼내기(값);
    const 줄 = readFileSync(join(자료, 'args.txt'), 'utf8').trim().split('\n');
    expect(줄[0]).toBe('-I');
    expect(줄[1]!.trim()).toBe('1');
    expect(줄[2]).toMatch(/game-build-[^/]+\/data$/);
    expect(알림[0]).toContain('타입 3 묶음 종류 2');
    expect(캐시맞나(자료, '6889')).toBe(true);
    expect(readdirSync(값.임시)).toEqual([]);
  });

  it('zip 은 스트림으로 디스크 파일에 받아 파이썬에 경로로 넘긴다 — 길이를 안 알려도 된다', async () => {
    const 자료 = 새폴더();
    링크쓰기(자료);
    const 조각들 = [new Uint8Array([80, 75]), new Uint8Array([3, 4])];
    const 흐름 = async () => new Response(new ReadableStream<Uint8Array>({ start(c) { for (const x of 조각들) c.enqueue(x); c.close(); } }));
    const { 알림, 입력: 값 } = 입력(자료, { 파이썬: 가짜파이썬('cp "$3" "$5/zip.bin"; echo ok'), 받는것: 흐름 as unknown as typeof fetch });
    await 게임빌드데이터꺼내기(값);
    expect([...readFileSync(join(자료, 'zip.bin'))]).toEqual([80, 75, 3, 4]);
    expect(알림[0]).toContain('꺼냈다');
  });

  it('받는 도중 누적 바이트가 상한을 넘으면 끊고 파이썬을 안 부른다 — Content-Length 가 없어도 · 있고 크면 받기 전에', async () => {
    const 자료 = 새폴더();
    링크쓰기(자료);
    const 흐름 = async () => new Response(new ReadableStream<Uint8Array>({ start(c) { for (let i = 0; i < 5; i += 1) c.enqueue(new Uint8Array(4)); c.close(); } }));
    const 가짜 = 가짜파이썬('echo 불렸다 > "$5/불림"');
    const 첫 = 입력(자료, { 파이썬: 가짜, 받는것: 흐름 as unknown as typeof fetch, 받기상한: 10 });
    await 게임빌드데이터꺼내기(첫.입력);
    expect(첫.알림[0]).toContain('너무 크다');
    expect(readdirSync(첫.입력.임시)).toEqual([]);
    const 알려줌 = async () => new Response(null, { headers: { 'content-length': '11' } });
    const 둘째 = 입력(자료, { 파이썬: 가짜, 받는것: 알려줌 as unknown as typeof fetch, 받기상한: 10 });
    await 게임빌드데이터꺼내기(둘째.입력);
    expect(둘째.알림[0]).toContain('너무 크다');
    expect(existsSync(join(자료, '불림'))).toBe(false);
  });

  it('파이썬이 건너뜀(3)이면 열쇠를 남기고 다시 안 받는다 — IL2CPP', async () => {
    const 자료 = 새폴더();
    링크쓰기(자료);
    const 가짜 = 가짜파이썬('echo "Managed 폴더가 없다(IL2CPP 빌드)"; exit 3');
    const { 알림, 입력: 값 } = 입력(자료, { 파이썬: 가짜, 받는것: 응답(await 압축({ 'G_Data/il2cpp_data/Metadata/global-metadata.dat': 'x' })) as unknown as typeof fetch });
    await 게임빌드데이터꺼내기(값);
    expect(알림[0]).toContain('IL2CPP');
    expect(캐시맞나(자료, '6889')).toBe(true);
  });

  it('파이썬이 zip 을 거절(2)하면 열쇠를 안 남기고 까닭을 알린다', async () => {
    const 자료 = 새폴더();
    링크쓰기(자료);
    const 가짜 = 가짜파이썬('echo "zip 에 자리 밖으로 새는 항목이 있다: ../evil"; exit 2');
    const { 알림, 입력: 값 } = 입력(자료, { 파이썬: 가짜, 받는것: 응답(await 압축({ 'G_Data/Managed/A.dll': 'x' })) as unknown as typeof fetch });
    await 게임빌드데이터꺼내기(값);
    expect(알림[0]).toContain('자리 밖으로');
    expect(캐시맞나(자료, '6889')).toBe(false);
    expect(readdirSync(값.임시)).toEqual([]);
  });

  it('파이썬이 실패하면 열쇠를 안 남겨 다음에 다시 시도한다', async () => {
    const 자료 = 새폴더();
    링크쓰기(자료);
    const 가짜 = 가짜파이썬('echo 터졌다 >&2; exit 4');
    const { 알림, 입력: 값 } = 입력(자료, { 파이썬: 가짜, 받는것: 응답(await 압축({ 'G_Data/Managed/A.dll': 'x' })) as unknown as typeof fetch });
    await 게임빌드데이터꺼내기(값);
    expect(알림[0]).toContain('터졌다');
    expect(캐시맞나(자료, '6889')).toBe(false);
  });

  it.skipIf(!existsSync(시스템파이썬))('진짜 파이썬 — .. 이름이 든 zip 은 거절하고 어디에도 안 쓴다 · IL2CPP zip 은 건너뛰며 열쇠를 남긴다', async () => {
    const 슬립 = 새폴더();
    링크쓰기(슬립);
    const 나쁜 = 입력(슬립, { 파이썬: 시스템파이썬, 받는것: 응답(await 압축({ 'G_Data/Managed/A.dll': 'x', 'G_Data/../../evil.txt': 'x' })) as unknown as typeof fetch });
    await 게임빌드데이터꺼내기(나쁜.입력);
    expect(나쁜.알림[0]).toContain('자리 밖으로');
    expect(캐시맞나(슬립, '6889')).toBe(false);
    for (const 위 of ['..', '../..']) expect(existsSync(join(나쁜.입력.임시, 위, 'evil.txt'))).toBe(false);
    expect(readdirSync(나쁜.입력.임시)).toEqual([]);

    const 자료 = 새폴더();
    링크쓰기(자료);
    const 끝 = 입력(자료, { 파이썬: 시스템파이썬, 받는것: 응답(await 압축({ 'G_Data/il2cpp_data/Metadata/global-metadata.dat': 'x' })) as unknown as typeof fetch });
    await 게임빌드데이터꺼내기(끝.입력);
    expect(끝.알림[0]).toContain('IL2CPP');
    expect(캐시맞나(자료, '6889')).toBe(true);
  });

  describe('작업 바탕 캐시', () => {
    it('꺼낸 데이터를 캐시에 남기고, 다음 작성의 새 자료 폴더는 받지 않고 거기서 복사한다 · 앞 빌드 캐시는 지운다', async () => {
      const 캐시 = join(새폴더(), 'game-build-data', 'MTI');
      const 가짜 = 가짜파이썬('echo \'{"A":{}}\' > "$5/game-build-data.json"; echo "Mob a:int" > "$5/game-types.txt"; echo "타입 1 묶음 종류 1"');
      const 첫자료 = 새폴더();
      링크쓰기(첫자료);
      await 게임빌드데이터꺼내기(입력(첫자료, { 파이썬: 가짜, 캐시자리: 캐시, 받는것: 응답(await 압축({ 'G_Data/Managed/A.dll': 'x' })) as unknown as typeof fetch }).입력);
      expect(readdirSync(캐시)).toEqual(['6889']);
      expect(readdirSync(join(캐시, '6889')).sort()).toEqual(['game-build-data.json', 'game-build-data.key', 'game-types.txt']);

      const 둘째자료 = 새폴더();
      링크쓰기(둘째자료);
      const 받는것 = vi.fn();
      const 둘째 = 입력(둘째자료, { 파이썬: join(둘째자료, '없는-python'), 캐시자리: 캐시, 받는것: 받는것 as unknown as typeof fetch });
      await 게임빌드데이터꺼내기(둘째.입력);
      expect(받는것).not.toHaveBeenCalled();
      expect(둘째.알림[0]).toContain('캐시에서 가져왔다');
      expect(readFileSync(join(둘째자료, 게임자리.종류표), 'utf8')).toBe('Mob a:int\n');
      expect(캐시맞나(둘째자료, '6889')).toBe(true);
    });

    it('빌드가 바뀌면 새로 받아 캐시를 바꾼다(앞 빌드 것은 지운다)', async () => {
      const 캐시 = join(새폴더(), 'game-build-data', 'MTI');
      const 가짜 = 가짜파이썬('echo \'{}\' > "$5/game-build-data.json"; echo ok');
      for (const 번호 of ['6889', '6890']) {
        const 자료 = 새폴더();
        writeFileSync(join(자료, 'app-link.txt'), 링크.replace('6889', 번호));
        await 게임빌드데이터꺼내기(입력(자료, { 파이썬: 가짜, 캐시자리: 캐시, 받는것: 응답(await 압축({ 'G_Data/Managed/A.dll': 'x' })) as unknown as typeof fetch }).입력);
      }
      expect(readdirSync(캐시)).toEqual(['6890']);
    });

    it('캐시 자리가 없으면(접두사를 못 구함) 자료 폴더에만 둔다', async () => {
      const 자료 = 새폴더();
      링크쓰기(자료);
      const { 입력: 값 } = 입력(자료, { 파이썬: 가짜파이썬('echo ok'), 받는것: 응답(await 압축({ 'G_Data/Managed/A.dll': 'x' })) as unknown as typeof fetch });
      await 게임빌드데이터꺼내기(값);
      expect(캐시맞나(자료, '6889')).toBe(true);
    });
  });
});

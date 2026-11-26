// 게임 빌드 데이터 꺼내기 검사 — 링크 바꾸기 · zip slip 거절 · 풀 항목 고르기 · 캐시 열쇠 · 파이썬이 없을 때 건너뜀 (게임 정보 먼저 쌓기)
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import JSZip from 'jszip';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { 게임자리 } from './authoring-game.js';
import { 게임빌드데이터꺼내기, 받을주소, 빌드열쇠, 캐시맞나, 풀계획만들기, 풀기 } from './authoring-game-build-data.js';

const 링크 = 'https://qa.example.com/api/builds/6889/apk?exp=1790000000&sig=abc';
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
});

describe('풀계획만들기', () => {
  it('Managed 가 있는 데이터 폴더를 뿌리로 잡고 그림 · 소리 원본과 StreamingAssets 는 뺀다', () => {
    const 계획 = 풀계획만들기([
      'Cats Go.exe', 'Cats Go_Data/Managed/A.dll', 'Cats Go_Data/globalgamemanagers', 'Cats Go_Data/level0', 'Cats Go_Data/level0.resS',
      'Cats Go_Data/sharedassets0.resource', 'Cats Go_Data/StreamingAssets/video.mp4', 'Cats Go_Data/', 'UnityPlayer.dll',
    ]);
    expect(계획).toEqual({ 뿌리: 'Cats Go_Data', 항목: ['Cats Go_Data/Managed/A.dll', 'Cats Go_Data/globalgamemanagers', 'Cats Go_Data/level0'] });
  });

  it('안드로이드 · 맥 꼴 뿌리도 잡는다', () => {
    expect(풀계획만들기(['assets/bin/Data/Managed/A.dll', 'assets/bin/Data/data.unity3d'])).toEqual({ 뿌리: 'assets/bin/Data', 항목: ['assets/bin/Data/Managed/A.dll', 'assets/bin/Data/data.unity3d'] });
    expect(풀계획만들기(['G.app/Contents/Resources/Data/Managed/A.dll'])).toMatchObject({ 뿌리: 'G.app/Contents/Resources/Data' });
  });

  it('Managed 가 없으면(IL2CPP) 건너뛴다', () => {
    expect(풀계획만들기(['G_Data/il2cpp_data/Metadata/global-metadata.dat', 'GameAssembly.dll'])).toEqual({ 건너뜀: 'Managed 폴더가 없다(IL2CPP 빌드)' });
  });

  it('zip slip — 자리 밖으로 새는 이름이 하나라도 있으면 통째로 거절한다', () => {
    for (const 나쁜 of ['../evil', 'G_Data/../../evil', '/etc/passwd', 'C:/evil', 'G_Data\\..\\evil', 'a\0b']) {
      expect(풀계획만들기(['G_Data/Managed/A.dll', 나쁜])).toHaveProperty('막힘');
    }
  });
});

describe('풀기', () => {
  it('뿌리를 떼고 대상 폴더에 일반 파일로 푼다', async () => {
    const zip = await JSZip.loadAsync(await 압축({ 'G_Data/Managed/A.dll': 'dll', 'G_Data/sub/x.assets': 'assets' }));
    const 대상 = 새폴더();
    await 풀기(zip, 'G_Data', ['G_Data/Managed/A.dll', 'G_Data/sub/x.assets'], 대상);
    expect(readFileSync(join(대상, 'Managed/A.dll'), 'utf8')).toBe('dll');
    expect(readFileSync(join(대상, 'sub/x.assets'), 'utf8')).toBe('assets');
  });

  it('자리 밖으로 가는 항목은 안 쓰고 던진다', async () => {
    const zip = new JSZip();
    zip.file('G_Data/../../evil.txt', 'x');
    const 대상 = join(새폴더(), 'out');
    mkdirSync(대상);
    await expect(풀기(zip, 'G_Data', ['G_Data/../../evil.txt'], 대상)).rejects.toThrow('자리 밖');
    expect(existsSync(join(대상, '..', 'evil.txt'))).toBe(false);
  });

  it('풀린 크기가 상한을 넘으면 던진다(압축 폭탄)', async () => {
    const zip = await JSZip.loadAsync(await 압축({ 'G_Data/a': 'x'.repeat(100) }));
    await expect(풀기(zip, 'G_Data', ['G_Data/a'], 새폴더(), 50)).rejects.toThrow('상한');
  });
});

describe('게임빌드데이터꺼내기', () => {
  const 입력 = (자료: string, 더: Partial<Parameters<typeof 게임빌드데이터꺼내기>[0]> = {}) => {
    const 알림: string[] = [];
    return { 알림, 입력: { 자료, 임시: 새폴더(), 집: 새폴더(), 관리주소: 'http://admin:3000', 자식: null, 알린다: (글: string) => 알림.push(글), ...더 } };
  };
  const 링크쓰기 = (자료: string): void => writeFileSync(join(자료, 'app-link.txt'), 링크);

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

  it('IL2CPP zip 은 파이썬을 안 부르고 열쇠만 남겨 다시 안 받는다', async () => {
    const 자료 = 새폴더();
    링크쓰기(자료);
    const 받는것 = vi.fn(async () => new Response(await 압축({ 'G_Data/il2cpp_data/Metadata/global-metadata.dat': 'x' })));
    const { 알림, 입력: 값 } = 입력(자료, { 파이썬: process.execPath, 받는것: 받는것 as unknown as typeof fetch });
    await 게임빌드데이터꺼내기(값);
    expect(받는것).toHaveBeenCalledWith('http://admin:3000/api/builds/6889/apk?exp=1790000000&sig=abc', expect.anything());
    expect(알림[0]).toContain('IL2CPP');
    expect(캐시맞나(자료, '6889')).toBe(true);
  });

  it('.. 이름이 든 zip 도 임시 폴더 밖에 쓰지 않는다', async () => {
    const 자료 = 새폴더();
    링크쓰기(자료);
    const 가짜 = join(새폴더(), 'python3');
    writeFileSync(가짜, '#!/bin/sh\nexit 0\n');
    chmodSync(가짜, 0o755);
    const 받는것 = async () => new Response(await 압축({ 'G_Data/Managed/A.dll': 'x', 'G_Data/../../evil.txt': 'x' }));
    const { 입력: 값 } = 입력(자료, { 파이썬: 가짜, 받는것: 받는것 as unknown as typeof fetch });
    await 게임빌드데이터꺼내기(값);
    expect(existsSync(join(값.임시, '..', 'evil.txt'))).toBe(false);
    expect(existsSync(join(값.임시, '..', '..', 'evil.txt'))).toBe(false);
    expect(readdirSync(값.임시)).toEqual([]);
  });

  it('파이썬이 잘 끝나면 풀어 준 폴더 · 자료 폴더를 넘기고 열쇠를 남기고 풀어 놓은 것을 지운다', async () => {
    const 자료 = 새폴더();
    링크쓰기(자료);
    const 가짜 = join(새폴더(), 'python3');
    writeFileSync(가짜, '#!/bin/sh\necho "$1" > "$4/args.txt"; ls "$3/Managed" >> "$4/args.txt"; echo "타입 3 묶음 종류 2"\n');
    chmodSync(가짜, 0o755);
    const 받는것 = async () => new Response(await 압축({ 'G_Data/Managed/A.dll': 'x', 'G_Data/level0': 'y' }));
    const { 알림, 입력: 값 } = 입력(자료, { 파이썬: 가짜, 받는것: 받는것 as unknown as typeof fetch });
    await 게임빌드데이터꺼내기(값);
    expect(readFileSync(join(자료, 'args.txt'), 'utf8')).toBe('-I\nA.dll\n');
    expect(알림[0]).toContain('타입 3 묶음 종류 2');
    expect(캐시맞나(자료, '6889')).toBe(true);
    expect(readdirSync(값.임시)).toEqual([]);
  });

  it('파이썬이 실패하면 열쇠를 안 남겨 다음에 다시 시도한다', async () => {
    const 자료 = 새폴더();
    링크쓰기(자료);
    const 가짜 = join(새폴더(), 'python3');
    writeFileSync(가짜, '#!/bin/sh\necho 터졌다 >&2; exit 3\n');
    chmodSync(가짜, 0o755);
    const 받는것 = async () => new Response(await 압축({ 'G_Data/Managed/A.dll': 'x' }));
    const { 알림, 입력: 값 } = 입력(자료, { 파이썬: 가짜, 받는것: 받는것 as unknown as typeof fetch });
    await 게임빌드데이터꺼내기(값);
    expect(알림[0]).toContain('터졌다');
    expect(캐시맞나(자료, '6889')).toBe(false);
  });
});

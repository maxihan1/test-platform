// 볼륨 파일 도우미 단위 테스트. DB 없이 임시 artifacts 폴더만 쓴다

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 볼륨파일, 볼륨파일읽기 } from './artifactFile.js';

let 뿌리: string;
let 밖: string;

beforeEach(() => {
  뿌리 = mkdtempSync(join(tmpdir(), 'artifact-file-'));
  밖 = mkdtempSync(join(tmpdir(), 'artifact-out-'));
  process.env.PLATFORM_ARTIFACTS_DIR = 뿌리;
  mkdirSync(join(뿌리, 'runs', '1', '2'), { recursive: true });
  writeFileSync(join(뿌리, 'runs', '1', '2', '1.png'), 'png');
  writeFileSync(join(밖, 'environ'), 'SESSION_SECRET=비밀');
});

afterEach(() => {
  delete process.env.PLATFORM_ARTIFACTS_DIR;
  rmSync(뿌리, { recursive: true, force: true });
  rmSync(밖, { recursive: true, force: true });
});

describe('볼륨파일', () => {
  it('볼륨 안 일반 파일이면 그 자리를 준다', async () => {
    expect(await 볼륨파일(join(뿌리, 'runs', '1', '2', '1.png'))).toMatch(/runs\/1\/2\/1\.png$/);
  });

  it('바로가기 파일은 null 이다 — 볼륨 안을 가리켜도 다른 항목 파일을 꺼내지 못하게', async () => {
    symlinkSync(join(밖, 'environ'), join(뿌리, 'runs', '1', '2', '2.png'));
    symlinkSync(join(뿌리, 'runs', '1', '2', '1.png'), join(뿌리, 'runs', '1', '2', '3.png'));
    expect(await 볼륨파일(join(뿌리, 'runs', '1', '2', '2.png'))).toBeNull();
    expect(await 볼륨파일(join(뿌리, 'runs', '1', '2', '3.png'))).toBeNull();
  });

  it('가는 길의 폴더가 바로가기여도 null 이다', async () => {
    symlinkSync(밖, join(뿌리, 'runs', '1', '9'));
    expect(await 볼륨파일(join(뿌리, 'runs', '1', '9', 'environ'))).toBeNull();
  });

  it('볼륨 뿌리 자체가 바로가기면 그 아래 파일은 내준다', async () => {
    const 바로가기뿌리 = join(밖, 'artifacts');
    symlinkSync(뿌리, 바로가기뿌리);
    process.env.PLATFORM_ARTIFACTS_DIR = 바로가기뿌리;
    expect(await 볼륨파일(join(바로가기뿌리, 'runs', '1', '2', '1.png'))).not.toBeNull();
  });

  it('볼륨 밖 경로 · 폴더 · 없는 파일은 null 이다', async () => {
    expect(await 볼륨파일(join(밖, 'environ'))).toBeNull();
    expect(await 볼륨파일(join(뿌리, '..', 'environ'))).toBeNull();
    expect(await 볼륨파일(join(뿌리, 'runs', '1', '2'))).toBeNull();
    expect(await 볼륨파일(join(뿌리, 'runs', '1', '2', '9.png'))).toBeNull();
  });
});

describe('볼륨파일읽기', () => {
  it('일반 파일은 읽고 바로가기는 던진다', async () => {
    symlinkSync(join(밖, 'environ'), join(뿌리, 'runs', '1', '2', '2.png'));
    expect((await 볼륨파일읽기(join(뿌리, 'runs', '1', '2', '1.png'))).toString()).toBe('png');
    await expect(볼륨파일읽기(join(뿌리, 'runs', '1', '2', '2.png'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

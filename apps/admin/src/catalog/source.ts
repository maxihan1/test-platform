// 실패한 줄 둘레의 소스를 발췌한다. 상세 화면의 '실패 지점 코드'가 이 값을 접힌 채로 연다 (SPEC §8.4)

import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

import { testsRoot } from './scanner.js';

const CONTEXT = 5;

export interface Excerpt {
  lines: { no: number; text: string }[];
  focus: number;
}

export function excerpt(text: string, line: number | undefined): Excerpt {
  const all = text.split('\n');
  const focus = Math.min(Math.max(line ?? 1, 1), all.length);
  const from = Math.max(1, focus - CONTEXT);
  const to = Math.min(all.length, focus + CONTEXT);

  const lines = [];
  for (let no = from; no <= to; no += 1) lines.push({ no, text: all[no - 1] ?? '' });

  return { lines, focus };
}

export async function readExcerpt(filePath: string, line: number | undefined): Promise<Excerpt> {
  const root = testsRoot();
  const absolute = resolve(root, filePath);

  // file_path는 DB를 거쳐 오지만 결국 파일을 여는 자리다. tests 폴더 밖은 읽지 않는다
  if (!absolute.startsWith(root + sep)) {
    throw new Error(`tests 폴더 밖의 경로다: ${filePath}`);
  }

  return excerpt(await readFile(absolute, 'utf8'), line);
}

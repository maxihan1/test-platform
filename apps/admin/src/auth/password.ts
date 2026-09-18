// 비밀번호를 되돌릴 수 없는 값으로 바꾸고 맞춰 보는 곳. 원문은 DB에도 로그에도 남기지 않는다 (SPEC §3.5)
// 새 부품을 쓰지 않는다 — Node 내장 crypto.scrypt 로 된다 (SPEC §9.1)

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const 늘리기 = promisify(scrypt) as (
  비밀번호: string,
  소금: Buffer,
  길이: number,
) => Promise<Buffer>;

const 길이 = 64;

// 사람이 화면에서 읽어 옮겨 적는다. 0·O·1·l 처럼 헷갈리는 글자를 뺀다
const 글자 = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export async function 해시(비밀번호: string): Promise<string> {
  // 소금은 계정마다 다르다. 같아 버리면 두 사람이 같은 비밀번호를 쓴 것이 해시만 보고도 드러난다
  const 소금 = randomBytes(16);
  const 값 = await 늘리기(비밀번호, 소금, 길이);
  return `scrypt$${소금.toString('hex')}$${값.toString('hex')}`;
}

export async function 검증(비밀번호: string, 저장값: string): Promise<boolean> {
  const [방식, 소금, 값] = 저장값.split('$');
  if (방식 !== 'scrypt' || 소금 === undefined || 값 === undefined) return false;

  const 기대 = Buffer.from(값, 'hex');
  if (기대.length !== 길이) return false;

  const 실제 = await 늘리기(비밀번호, Buffer.from(소금, 'hex'), 길이);
  // 앞에서부터 한 글자씩 비교하면 걸린 시간으로 몇 글자까지 맞았는지가 새어 나간다
  return timingSafeEqual(기대, 실제);
}

export function 무작위비밀번호(): string {
  // 사람이 타이핑해 넘기지 않는다. 시스템이 만들어 한 번만 보여준다 (SPEC §8.8)
  return Array.from(randomBytes(16), (n) => 글자[n % 글자.length]).join('');
}

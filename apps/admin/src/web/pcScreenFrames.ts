// 윈도우 PC 화면 영상 흐름을 조각으로 가르고 조각 머리를 푼다 — admin 이 4바이트 길이를 붙여 흘린 VISION 화면 통로 메시지 (도메인/실행 §7 「…/pc-screen」)
// 머리 꼴은 VISION 화면 통로 그대로다(Devicefarm packages/client/src/screen.ts) — 종류 1바이트 + 시각 µs Float64 빅엔디언

export type 조각종류 = 'delta' | 'key' | 'config';
const 종류들: readonly 조각종류[] = ['delta', 'key', 'config'];
const 머리길이 = 9;

/** 쌓인 바이트에서 다 온 조각만 떼고, 덜 온 끝은 남겨 다음 바이트와 잇는다 */
export function 조각을가른다(쌓인: Uint8Array): { 조각들: Uint8Array[]; 남은: Uint8Array } {
  const 조각들: Uint8Array[] = [];
  const 보기 = new DataView(쌓인.buffer, 쌓인.byteOffset, 쌓인.byteLength);
  let 자리 = 0;
  while (자리 + 4 <= 쌓인.byteLength) {
    const 길이 = 보기.getUint32(자리);
    if (자리 + 4 + 길이 > 쌓인.byteLength) break;
    조각들.push(쌓인.subarray(자리 + 4, 자리 + 4 + 길이));
    자리 += 4 + 길이;
  }
  return { 조각들, 남은: 쌓인.subarray(자리) };
}

export function 잇는다(앞: Uint8Array, 뒤: Uint8Array): Uint8Array {
  if (앞.byteLength === 0) return 뒤;
  const 합 = new Uint8Array(앞.byteLength + 뒤.byteLength);
  합.set(앞);
  합.set(뒤, 앞.byteLength);
  return 합;
}

/** 머리보다 짧거나 모르는 종류면 undefined — 버린다 */
export function 머리를푼다(조각: Uint8Array): { 종류: 조각종류; 시각: number | undefined; 영상: Uint8Array } | undefined {
  if (조각.byteLength < 머리길이) return undefined;
  const 종류 = 종류들[조각[0]!];
  if (종류 === undefined) return undefined;
  const 시각 = new DataView(조각.buffer, 조각.byteOffset + 1, 8).getFloat64(0);
  return { 종류, 시각: Number.isNaN(시각) ? undefined : 시각, 영상: 조각.subarray(머리길이) };
}

/** 설정 조각(Annex-B)의 SPS(NAL 7)에서 WebCodecs 코덱 이름 `avc1.PPCCLL` 을 만든다. 없거나 잘렸으면 undefined */
export function 코덱(설정: Uint8Array): string | undefined {
  for (let i = 0; i + 3 < 설정.length; i++) {
    if (설정[i] !== 0 || 설정[i + 1] !== 0 || 설정[i + 2] !== 1) continue;
    const n = i + 3;
    if ((설정[n]! & 0x1f) !== 7) continue;
    if (n + 3 >= 설정.length) return undefined;
    return 'avc1.' + [설정[n + 1]!, 설정[n + 2]!, 설정[n + 3]!].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  return undefined;
}

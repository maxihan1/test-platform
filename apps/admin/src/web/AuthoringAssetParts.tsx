// 작성 상세의 자료 고리와 산출물 설명 — AuthoringDetail.tsx 가 300줄을 넘어 뗐다 (2026-10-19 ⑫-9)

import { api, type AuthoringAsset } from './api.js';

/** 파일은 내려받기, 피그마는 저장된(정규화한) 주소로 연다 */
export function 자료고리({ 요청, 자료, 글 }: { 요청: number; 자료: AuthoringAsset; 글: string }) {
  if (자료.kind === 'FIGMA') {
    return (
      <a href={자료.figmaUrl ?? 자료.name} target="_blank" rel="noopener noreferrer">
        {글}
      </a>
    );
  }
  // 서버가 attachment 로 준다. download 는 같은 뜻을 브라우저에 한 번 더 말한다
  return (
    <a href={api.authoringAssetUrl(요청, 자료.id)} download>
      {글}
    </a>
  );
}

/**
 * 산출물이 무엇인지. 표시 사본은 어느 입력의 사본인지까지 — 입력이 여럿이면 이름 없이는 못 가린다.
 * 재실행의 입력은 원본 요청에 있어 이 목록에서 못 찾는다 — 그때는 원본 요청을 가리킨다
 */
export function 산출물설명(
  a: AuthoringAsset,
  자료들: AuthoringAsset[],
  원본요청: number | null,
  t: (키: string, 값?: Record<string, string | number>) => string,
): string {
  // 「역기획서」 · 「표시 사본」은 만든 사람만 아는 말이었다 (점검 12.16)
  if (a.role === 'REVERSE_SPEC') return t('화면에서 읽은 기획서');
  const 원본 = 자료들.find((x) => x.id === a.sourceAssetId);
  const 이름 =
    원본?.name ?? (원본요청 === null ? t('기록 없음') : t('원본 요청 #{번호}의 자료', { 번호: 원본요청 }));
  return `${t('차이를 표시한 기획서')} — ${이름}`;
}

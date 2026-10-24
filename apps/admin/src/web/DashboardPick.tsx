// 대시보드 머리의 서비스 · 기간 고르개와 그 조건을 주소(`?service=&days=`)에 남기는 도우미 (도메인/리포팅 §8.12 「서비스 · 기간 고르기」)

import type { MouseEvent } from 'react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { use말 } from './i18n.js';
import { 주소조건 } from './leaveGuard.js';

export const 기간들 = [7, 14, 30] as const;
export type 기간 = (typeof 기간들)[number];
export const 기본기간: 기간 = 14;

export interface 대시보드조건 {
  /** 서비스 번호. null 이면 볼 수 있는 서비스 전체 */
  서비스: number | null;
  일: 기간;
}

/** 주소의 조건을 읽는다. 알아볼 수 없는 값은 기본값(전체 서비스 · 14일)으로 둔다 */
export function 주소에서조건(): 대시보드조건 {
  const 주소 = 주소조건();
  const 서비스글 = 주소.get('service');
  return {
    서비스: 서비스글 !== null && /^[1-9]\d{0,9}$/.test(서비스글) ? Number(서비스글) : null,
    일: 기간들.find((일) => String(일) === 주소.get('days')) ?? 기본기간,
  };
}

/** 주소에 적을 조건. 기본값은 적지 않는다 */
export function 조건을주소로(조건: 대시보드조건): Record<string, string> {
  return {
    ...(조건.서비스 === null ? {} : { service: String(조건.서비스) }),
    ...(조건.일 === 기본기간 ? {} : { days: String(조건.일) }),
  };
}

/** 서버에 보내는 조건. 기본값은 빼서 주소가 짧다 */
export function 조건을요청으로(조건: 대시보드조건): { service?: number; days?: number } {
  return {
    ...(조건.서비스 === null ? {} : { service: 조건.서비스 }),
    ...(조건.일 === 기본기간 ? {} : { days: 조건.일 }),
  };
}

/**
 * 다른 서비스 화면으로 가는 링크에 다는 속성 — 눌러 가기 전에 고른 서비스를 그 서비스로 바꾼다.
 * 가운데 버튼(새 탭)은 click 이 아니라 auxclick 이다. 새 탭은 저장된 고른 서비스를 읽으므로 그 전에 바꿔 둔다.
 * 오른쪽 단추는 주소 복사 메뉴라 서비스를 바꾸면 사람이 모르게 바뀐다
 */
export function 서비스를열며(서비스열기: (serviceId: number) => void, serviceId: number) {
  return {
    onClick: () => 서비스열기(serviceId),
    onAuxClick: (e: MouseEvent) => {
      if (e.button === 1) 서비스열기(serviceId);
    },
  };
}

export function 고르개({
  조건,
  서비스들,
  on바뀜,
}: {
  조건: 대시보드조건;
  /** 아직 모르면 빈 목록. 서비스 고르개는 알 때만 그린다 */
  서비스들: { id: number; name: string }[];
  on바뀜: (조건: 대시보드조건) => void;
}) {
  const t = use말();
  return (
    <div className="dash-pick">
      {서비스들.length === 0 ? null : (
        <select
          aria-label={t('애플리케이션')}
          value={조건.서비스 === null ? '' : String(조건.서비스)}
          onChange={(e) => on바뀜({ ...조건, 서비스: e.target.value === '' ? null : Number(e.target.value) })}
        >
          <option value="">{t('전체 애플리케이션')}</option>
          {서비스들.map((서비스) => (
            <option key={서비스.id} value={String(서비스.id)}>
              {서비스.name}
            </option>
          ))}
        </select>
      )}
      <select
        aria-label={t('기간')}
        value={String(조건.일)}
        onChange={(e) => on바뀜({ ...조건, 일: 기간들.find((일) => String(일) === e.target.value) ?? 기본기간 })}
      >
        {기간들.map((일) => (
          <option key={일} value={String(일)}>
            {t('최근 {일}일', { 일 })}
          </option>
        ))}
      </select>
    </div>
  );
}

/** 대시보드 칸이 다른 화면으로 갈 때 쓰는 재료. 서비스번호는 지금 현황이 한 서비스뿐일 때만 있다 */
export interface 이동재료 {
  서비스번호: number | null;
  서비스열기: (serviceId: number) => void;
}

/** 현황이 한 서비스뿐이면 그 서비스를 고르며 가는 링크 속성. 여러 서비스를 섞은 칸은 어느 서비스인지 몰라 아무것도 안 바꾼다 */
export const 이동속성 = (이동?: 이동재료) =>
  이동 === undefined || 이동.서비스번호 === null ? {} : 서비스를열며(이동.서비스열기, 이동.서비스번호);

type 건수 = 대시보드응답['passRate']['current'];

/**
 * 실행 기록의 종류. 대시보드 수는 기능 · UI 를 합쳐 세서 그 칸의 UI 몫으로 가른다 (도메인/리포팅 §8.12 「칸에서 원인으로 내려간다」).
 * 기능 쪽에 보낼 것(실패만 보는 고리면 실패, 아니면 돌린 줄)이 있으면 기능, 없고 UI 쪽에만 있으면 UI 다 — 늘 기능이면 UI 실패로 못 내려갔다
 */
export function 실행종류(전체: 건수, ui: 건수, 실패만: boolean): 'UI' | 'FN' {
  const 셈 = (c: 건수): number => (실패만 ? c.fail : c.pass + c.fail + c.notRun);
  return 셈(ui) > 0 && 셈(ui) === 셈(전체) ? 'UI' : 'FN';
}

/**
 * 이번 창 전체로 고른 실패한 실행의 종류 — 날 · 서비스에 안 매인 고리(신규 실패 「더 있습니다」 · 실패 유형)가 쓴다.
 * 미실행도 — 실패 유형 칸은 실패와 미실행을 같이 센다. 그 고리는 둘을 합쳐 고른다
 */
export function 창실패종류(값: Pick<대시보드응답, 'passRate' | 'daily'>, 미실행도: boolean): 'UI' | 'FN' {
  const 셈 = (c: 건수): number => c.fail + (미실행도 ? c.notRun : 0);
  const ui = 값.daily.reduce((합, 날) => 합 + 셈(날.ui), 0);
  return ui > 0 && ui === 셈(값.passRate.current) ? 'UI' : 'FN';
}

/** 실행 기록 목록으로 가는 주소. 목록도 7 · 14 · 30일을 알아서 창 길이를 그대로 싣는다 */
export const 실행목록주소 = (일: number, 조건: Record<string, string> = {}, 종류: 'UI' | 'FN' = 'FN'): string =>
  `#/runs/${종류 === 'UI' ? 'ui' : 'fn'}?${new URLSearchParams({ ...조건, days: String(일) }).toString()}`;

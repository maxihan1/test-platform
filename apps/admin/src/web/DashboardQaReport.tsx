// 대시보드 여섯째 칸 「QA 리포트 · 승인 전 N건」 — 관리자에게만 선다. 누르면 QA 리포트 목록의 승인 전 필터 (도메인/리포팅 §8.21 「다른 화면의 고리」)

import { useEffect, useState } from 'react';

import { 수글, 칸 } from './DashboardTop.js';
import { use말 } from './i18n.js';
import { qaReportApi } from './qaReportApi.js';

export interface 승인볼앱 {
  id: number;
  prefix: string;
  name: string;
}

/** 애플리케이션마다 승인 전 리포트 수 — 목록 통로가 애플리케이션마다라 하나씩 묻는다. 목록의 「승인 전」 필터와 같은 수가 나온다 */
function use승인전수(앱들: readonly 승인볼앱[]): { 앱: 승인볼앱; 수: number }[] | null {
  const [수들, set수들] = useState<{ 앱: 승인볼앱; 수: number }[] | null>(null);
  const 열쇠 = 앱들.map((a) => a.prefix).join(',');
  useEffect(() => {
    let 살아있다 = true;
    set수들(null);
    Promise.all(앱들.map((앱) => qaReportApi.list(앱.prefix, { approved: false }).then((r) => ({ 앱, 수: r.total }))))
      .then((x) => {
        if (살아있다) set수들(x);
      })
      .catch((e: unknown) => {
        // 칸 하나가 못 서도 대시보드는 선다 — 숫자 자리에 「—」가 남는다
        console.error('[dashboard] could not count QA reports awaiting approval', e);
      });
    return () => {
      살아있다 = false;
    };
    // 앱 목록은 부를 때마다 새 배열이라 접두사로 본다
  }, [열쇠]);
  return 수들;
}

export function 승인전칸({ 차례, 앱들, 서비스열기 }: { 차례: number; 앱들: readonly 승인볼앱[]; 서비스열기: (serviceId: number) => void }) {
  const t = use말();
  const 수들 = use승인전수(앱들);
  const 있는 = (수들 ?? []).filter((x) => x.수 !== 0);
  // 목록은 사이드바 애플리케이션 것이다 — 승인 전이 있는 첫 애플리케이션으로 맞춰 간다
  const 갈앱 = 있는[0]?.앱;
  // 화면 글자 검사가 `>` 뒤 글을 화면 문구로 읽는다 — 셈은 영문 이름으로 둔다
  const total = 있는.map((x) => x.수).reduce((a, b) => a + b, 0);
  return (
    <칸
      차례={차례}
      그림="report"
      이름={t('QA 리포트 · 승인 전')}
      값={수들 === null ? null : 수글(total)}
      단위={t('건')}
      보조={수들 === null ? '' : 있는.length === 0 ? t('승인 전 리포트 없음') : 있는.map((x) => `${x.앱.name} ${String(x.수)}`).join(' · ')}
      링크={{ href: '#/qa-reports?approved=false', ...(갈앱 === undefined ? {} : { onClick: () => 서비스열기(갈앱.id) }) }}
    />
  );
}

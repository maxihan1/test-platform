// 계정 편집기의 운영 · 프로젝트와 권한 · 그래프(Grafana) 고르개와 목록 줄의 권한 요약 (도메인/인증 §8.8, 시안 B)

import type { UserRow, 배정 } from './api.js';
import { use말 } from './i18n.js';
import type { 기능, 등급, 칸 } from './role.js';
import { 계정요약, 권한경고, 기능순서, type 프로젝트줄 } from './settingsView.js';

// 값이 곧 번역 키다. `실행` · `케이스` · `실행자` 는 다른 화면에서 영어가 달라(Run · Case · Run by) 꼬리를 달아 따로 옮긴다
const 기능이름: Record<기능, string> = { cases: '케이스§권한', runs: '실행§권한', authoring: '작성' };
const 칸이름: Record<칸, string> = { none: '안 씀', read: '읽기', write: '쓰기' };
// 켜자마자 쓰기를 주면 사람이 모르고 넘긴다. 처음은 읽기다 (§8.8)
const 처음칸 = { cases: 'read', runs: 'read', authoring: 'read' } as const;
// 칸 셋을 하나씩 고르는 길은 그대로 두고, 자주 쓰는 조합을 한 번에 고르는 단추다 (점검 14.6)
const 권한묶음: { 이름: string; 칸들: Record<기능, 칸> }[] = [
  { 이름: '읽기 전용', 칸들: { cases: 'read', runs: 'read', authoring: 'read' } },
  { 이름: '작성자', 칸들: { cases: 'read', runs: 'read', authoring: 'write' } },
  { 이름: '실행자§권한', 칸들: { cases: 'read', runs: 'write', authoring: 'read' } },
];

function 칸고르개<T extends 칸>({ 이름, 값, 값들, on }: { 이름: string; 값: T; 값들: T[]; on: (v: T) => void }) {
  const t = use말();
  return (
    <div className="set-seg" role="group" aria-label={이름}>
      {값들.map((v) => (
        <button key={v} type="button" className="chip" aria-pressed={값 === v} onClick={() => on(v)}>
          {t(칸이름[v])}
        </button>
      ))}
    </div>
  );
}

export function PermissionPicker({
  projects,
  role,
  onRole,
  마지막운영,
  배정들,
  on배정들,
  dashboard,
  onDashboard,
}: {
  projects: 프로젝트줄[];
  role: 등급;
  onRole: (v: 등급) => void;
  /** 맞으면 운영을 끄는 길을 아예 안 그린다 (§3.5 · §7 LAST_ADMIN) */
  마지막운영: boolean;
  배정들: 배정[];
  on배정들: (v: 배정[]) => void;
  dashboard: 'none' | 'read';
  onDashboard: (v: 'none' | 'read') => void;
}) {
  const t = use말();
  const 운영 = role === 'admin';
  function 묶음고르기(projectId: number, 칸들: Record<기능, 칸>) {
    on배정들(배정들.map((it) => (it.projectId === projectId ? { ...it, permissions: { ...it.permissions, ...칸들 } } : it)));
  }

  function 칸바꾸기(projectId: number, f: 기능, v: 칸) {
    on배정들(배정들.map((it) => (it.projectId === projectId ? { ...it, permissions: { ...it.permissions, [f]: v } } : it)));
  }

  return (
    <>
      <div className="field">
        <span className="field-label">{t('관리자')}</span>
        <div>
          {마지막운영 ? (
            <div className="hint">{t('마지막 관리자라 관리자 권한을 끌 수 없습니다. 먼저 다른 사람을 관리자로 올립니다')}</div>
          ) : (
            <label className="set-pick">
              <input
                type="checkbox"
                checked={운영}
                onChange={(e) => onRole(e.target.checked ? 'admin' : 'member')}
              />
              {t('관리자 (배정된 프로젝트 전부 + 설정 · 반영)')}
            </label>
          )}
          {운영 ? (
            <div className="hint">{t('관리자는 배정된 프로젝트에서 모든 기능을 씁니다. 켜 둘 프로젝트만 고르세요.')}</div>
          ) : null}
        </div>
      </div>

      <div className="field">
        <span className="field-label">{t('프로젝트와 권한')}</span>
        <div className="set-perms">
          {projects.length === 0 ? <span className="hint">{t('먼저 프로젝트를 만듭니다')}</span> : null}
          {projects.map((s) => {
            const 내것 = 배정들.find((it) => it.projectId === s.id);
            const 경고 = 내것 === undefined ? null : 권한경고(내것.permissions);
            return (
              <div key={s.id} className="set-perm">
                <label className="set-pick">
                  <input
                    type="checkbox"
                    checked={내것 !== undefined}
                    onChange={(e) =>
                      on배정들(
                        e.target.checked
                          ? [...배정들, { projectId: s.id, permissions: { ...처음칸 } }]
                          : 배정들.filter((it) => it.projectId !== s.id),
                      )
                    }
                  />
                  {s.name} <span className="set-sub">{t('애플리케이션 {수}개', { 수: s.앱수 })}</span>
                </label>
                {내것 === undefined || 운영 ? null : (
                  <>
                    <div className="set-perm-row">
                      <span className="set-sub">{t('권한 묶음')}</span>
                      <div className="set-seg" role="group" aria-label={`${s.name} ${t('권한 묶음')}`}>
                        {권한묶음.map((묶음) => (
                          <button
                            key={묶음.이름}
                            type="button"
                            className="chip"
                            aria-pressed={기능순서.every((f) => 내것.permissions[f] === 묶음.칸들[f])}
                            onClick={() => 묶음고르기(s.id, 묶음.칸들)}
                          >
                            {t(묶음.이름)}
                          </button>
                        ))}
                      </div>
                    </div>
                    {기능순서.map((f) => (
                      <div key={f} className="set-perm-row">
                        <span className="set-sub">{t(기능이름[f])}</span>
                        <칸고르개
                          이름={`${s.name} ${t(기능이름[f])}`}
                          값={내것.permissions[f]}
                          값들={['none', 'read', 'write']}
                          on={(v) => 칸바꾸기(s.id, f, v)}
                        />
                      </div>
                    ))}
                  </>
                )}
                {/* allOff 는 운영이어도 서버가 거절한다. 칸이 숨어 있어도 이유는 보여야 한다 */}
                {경고 === 'allOff' ? (
                  <div className="hint set-perm-warn" role="status">
                    {t('세 칸이 모두 「안 씀」이면 저장되지 않습니다. 배정을 풀려면 프로젝트를 끄세요.')}
                  </div>
                ) : 경고 === 'noCases' && !운영 ? (
                  <div className="hint set-perm-warn" role="status">
                    {t('이대로면 실행 설정에서 고를 케이스가 보이지 않습니다.')}
                  </div>
                ) : null}
              </div>
            );
          })}
          <div className="hint">{t('프로젝트를 고르면 그 안의 애플리케이션이 모두 열리고, 새 애플리케이션이 들어와도 바로 열립니다. 배정받지 않은 프로젝트는 그 사람의 프로젝트 선택 목록에 뜨지 않습니다')}</div>
        </div>
      </div>

      {운영 ? null : (
        <div className="field">
          <span className="field-label">{t('그래프(Grafana)')}</span>
          <칸고르개 이름={t('그래프(Grafana)')} 값={dashboard} 값들={['none', 'read']} on={onDashboard} />
        </div>
      )}
    </>
  );
}

/** 저장해도 서버가 400 PERMISSIONS_SHAPE 로 돌려보낼 배정이 있나 */
export function 배정이틀렸나(배정들: 배정[]): boolean {
  return 배정들.some((it) => 권한경고(it.permissions) === 'allOff');
}

export function PermissionSummary({ row, projects }: { row: UserRow; projects: 프로젝트줄[] }) {
  const t = use말();
  const 요약 = 계정요약(row, projects);
  if (요약.운영) return <span className="set-sub">{t('관리자')}</span>;
  return (
    <div className="set-sum">
      {요약.프로젝트.length === 0 ? <span className="set-sub">{t('배정 없음')}</span> : null}
      {요약.프로젝트.map((s) => (
        <div key={s.이름} className="set-sum-line">
          <span className="set-sub">{s.이름}</span>
          {s.칸들.map(([f, c]) => (
            <span key={f} className={`set-perm-chip is-${c}`}>
              {t(기능이름[f])} {t(칸이름[c])}
            </span>
          ))}
        </div>
      ))}
      <div className="set-sum-line">
        <span className={`set-perm-chip is-${요약.대시보드}`}>
          {t('그래프(Grafana)')} {t(칸이름[요약.대시보드])}
        </span>
      </div>
    </div>
  );
}

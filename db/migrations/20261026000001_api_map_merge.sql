-- 서비스 지도에 쌓인 줄을 새 API 틀로 합치고, 계정 아이디로 가려진 별표 줄을 지운다 (진행판 WEB-F6-03)
-- 칸 규칙은 apps/admin/src/prd/apiMap.ts API틀이 정본이다 — 「세는 방식」 절(docs/spec/도메인/작성.md §3.6 「★ 결정 목록」)

-- migrate:up

-- 합치기 시작
-- 별표 칸이 든 줄 — trace 가림이 계정 아이디(`admin`)로 경로를 가린 것이다(/api/admin/banners). 어느 API 인지 몰라 지우고 다음 정식 실행이 다시 쌓는다. 쓴 줄은 같이 지워진다
DELETE FROM service_api WHERE strpos(path, '********') > 0;

-- 주문번호 꼴 칸(영문 세 자까지 + 숫자 넷 이상 — scripts/authoring-crawl-rules.ts 숫자마디)을 :n 으로 바꾼 틀. 틀이 바뀌는 줄만 남긴다
CREATE TEMP TABLE api_새틀 AS
SELECT a.id, a.service_id, a.method, a.host,
       (SELECT string_agg(CASE WHEN 칸 ~* '^[a-z]{0,3}(?=(?:[-_]?\d){4})[\d_-]+$' THEN ':n' ELSE 칸 END, '/' ORDER BY n)
          FROM unnest(string_to_array(a.path, '/')) WITH ORDINALITY AS t(칸, n)) AS path
  FROM service_api a;
DELETE FROM api_새틀 b USING service_api a WHERE a.id = b.id AND a.path = b.path;

-- 합칠 줄 — 처음 본 때는 가장 이른 것, 마지막 본 때 · 성공 코드는 가장 늦은 것
INSERT INTO service_api (service_id, method, host, path, first_seen, last_seen, ok_status)
SELECT b.service_id, b.method, b.host, b.path, min(a.first_seen), max(a.last_seen),
       (array_agg(a.ok_status ORDER BY a.last_seen DESC) FILTER (WHERE a.ok_status IS NOT NULL))[1]
  FROM api_새틀 b JOIN service_api a ON a.id = b.id
 GROUP BY b.service_id, b.method, b.host, b.path
ON CONFLICT (service_id, method, host, path) DO UPDATE
   SET first_seen = least(service_api.first_seen, EXCLUDED.first_seen),
       last_seen = greatest(service_api.last_seen, EXCLUDED.last_seen),
       ok_status = COALESCE(service_api.ok_status, EXCLUDED.ok_status);

-- 케이스 줄 — 같은 케이스가 주문 여럿을 불렀으면 한 줄로, 부른 단계는 합친다
INSERT INTO service_api_use (api_id, service_id, tc_id, run_id, steps, seen_at)
SELECT c.id, u.service_id, u.tc_id, max(u.run_id), COALESCE(array_agg(DISTINCT t.s ORDER BY t.s) FILTER (WHERE t.s IS NOT NULL), '{}'), max(u.seen_at)
  FROM api_새틀 b
  JOIN service_api c ON c.service_id = b.service_id AND c.method = b.method AND c.host = b.host AND c.path = b.path
  JOIN service_api_use u ON u.api_id = b.id AND u.tc_id IS NOT NULL
  LEFT JOIN LATERAL unnest(u.steps) AS t(s) ON true
 GROUP BY c.id, u.service_id, u.tc_id
ON CONFLICT (api_id, tc_id) WHERE tc_id IS NOT NULL DO UPDATE
   SET run_id = greatest(service_api_use.run_id, EXCLUDED.run_id),
       steps = ARRAY(SELECT DISTINCT x FROM unnest(service_api_use.steps || EXCLUDED.steps) AS x ORDER BY x),
       seen_at = greatest(service_api_use.seen_at, EXCLUDED.seen_at);

-- 화면 줄 — 같은 화면이면 한 줄
INSERT INTO service_api_use (api_id, service_id, env, state, screen_url, seen_at)
SELECT c.id, u.service_id, u.env, u.state, u.screen_url, max(u.seen_at)
  FROM api_새틀 b
  JOIN service_api c ON c.service_id = b.service_id AND c.method = b.method AND c.host = b.host AND c.path = b.path
  JOIN service_api_use u ON u.api_id = b.id AND u.tc_id IS NULL
 GROUP BY c.id, u.service_id, u.env, u.state, u.screen_url
ON CONFLICT DO NOTHING;

-- 옛 줄 — 쓴 줄은 같이 지워진다
DELETE FROM service_api a USING api_새틀 b WHERE a.id = b.id;
DROP TABLE api_새틀;
-- 합치기 끝

-- migrate:down

-- 합친 줄은 되돌리지 않는다 — 주문번호마다 갈렸던 줄은 다음 실행이 새 틀로 다시 쌓는다
SELECT 1;

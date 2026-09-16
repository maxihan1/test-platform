// npm run check:tests 진입점. SPEC §4 케이스 파일 규칙 K1~K8 검사기는 WS-A가 채운다.
// CI(.github/workflows/ci.yml)와 pre-push 훅이 이 이름으로 부르므로 지금은 통과만 시킨다

console.log('아직 검사기 없음 — WS-A가 apps/admin/src/catalog/check.ts를 채운다 (SPEC §4 K1~K8)');
process.exit(0);

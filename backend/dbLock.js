// db.js는 단일 공유 SQLite 커넥션이라, 트랜잭션이 열린 채로 await(Supabase 호출 등)를
// 거치는 동안 다른 요청의 쓰기가 같은 커넥션에 끼어들면 ROLLBACK이 무관한 요청의
// 커밋되지 않은 쓰기까지 되돌릴 수 있다. 로컬 DB에 쓰는 모든 경로를 이 락으로 직렬화한다.
let tail = Promise.resolve();

function withDbLock(fn) {
  const result = tail.then(fn);
  tail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

module.exports = { withDbLock };

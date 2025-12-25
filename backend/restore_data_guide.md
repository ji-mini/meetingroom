# 데이터 복구 가이드

## 현재 상황

마이그레이션 중 `location` 컬럼이 삭제되고 `building`, `floor` 컬럼이 추가되었습니다.

## 데이터 복구 가능 여부

### ✅ 복구 가능한 경우

1. **다른 컬럼의 데이터는 그대로 남아있습니다**
   - `id`, `name`, `capacity`, `status`, `createdAt`, `updatedAt` 등은 유지됩니다
   - `location` 컬럼의 데이터만 삭제되었습니다

2. **PostgreSQL 백업이 있는 경우**
   - `pg_dump` 백업 파일이 있다면 복구 가능
   - 자동 백업이 설정되어 있다면 복구 가능

3. **트랜잭션 로그(WAL)가 있는 경우**
   - PostgreSQL의 WAL을 통해 복구 가능 (고급)

### ❌ 복구 불가능한 경우

1. **백업이 없는 경우**
   - `location` 컬럼의 데이터는 복구 불가능
   - 하지만 다른 데이터는 그대로 남아있습니다

## 복구 방법

### 방법 1: 백업에서 복구 (백업이 있는 경우)

```bash
# 백업 파일이 있다면
psql -U your_user -d meetingroom_db < backup_file.sql
```

### 방법 2: 수동으로 데이터 재입력

1. 스키마 롤백 후 `location` 컬럼 복구
2. 기존 회의실 데이터에 `location` 값을 수동으로 입력

### 방법 3: 다른 소스에서 데이터 가져오기

- 다른 환경(운영, 스테이징)의 데이터베이스에서 가져오기
- CSV나 다른 형식의 백업 파일이 있다면 import

## 확인 사항

먼저 다음을 확인하세요:

1. **회의실 데이터가 남아있는지 확인**
   ```sql
   SELECT COUNT(*) FROM meeting_rooms;
   SELECT * FROM meeting_rooms LIMIT 5;
   ```

2. **예약 데이터가 남아있는지 확인**
   ```sql
   SELECT COUNT(*) FROM reservations;
   ```

3. **사용자 데이터가 남아있는지 확인**
   ```sql
   SELECT COUNT(*) FROM users;
   ```

## 다음 단계

1. `check_data_status.sql` 파일을 실행하여 현재 상태 확인
2. 데이터가 남아있다면, 스키마만 롤백하고 `location` 값을 수동으로 입력
3. 데이터가 모두 삭제되었다면, 백업에서 복구하거나 수동으로 재입력





















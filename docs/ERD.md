# 데이터베이스 ERD

## 엔티티 관계도

```
┌─────────────────────┐
│   MeetingRoom       │
├─────────────────────┤
│ id (PK, UUID)       │
│ name                │
│ location            │
│ capacity            │
│ status (ACTIVE/     │
│        CLOSED)      │
│ createdAt           │
│ updatedAt           │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐
│   Reservation       │
├─────────────────────┤
│ id (PK, UUID)       │
│ roomId (FK)         │
│ userId              │
│ title               │
│ startAt (DateTime)  │
│ endAt (DateTime)    │
│ createdAt           │
│ updatedAt           │
└─────────────────────┘
```

## 관계 설명

- **MeetingRoom** (회의실)
  - 하나의 회의실은 여러 예약을 가질 수 있음 (1:N)
  - `status`는 `ACTIVE`(사용 가능) 또는 `CLOSED`(사용 불가) 상태

- **Reservation** (예약)
  - 하나의 예약은 하나의 회의실에 속함 (N:1)
  - `roomId`는 `MeetingRoom.id`를 참조
  - `userId`는 현재 MVP에서는 단순 문자열 (향후 User 테이블과 연결 가능)
  - `startAt`과 `endAt`은 예약 시간 범위를 나타냄

## 인덱스

- `Reservation` 테이블에 `(roomId, startAt, endAt)` 복합 인덱스가 설정되어 있어 시간 중복 체크 성능 최적화

## 비즈니스 규칙

1. **시간 중복 방지**: 동일 회의실의 예약은 시간대가 겹치면 안 됨
2. **시간 유효성**: `startAt < endAt` 이어야 함
3. **회의실 상태**: `CLOSED` 상태의 회의실은 예약 불가

















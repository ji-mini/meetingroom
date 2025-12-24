import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Repeat } from 'lucide-react';
import type { MeetingRoom, Reservation } from '@/types';
import { formatTimeRange } from '@/utils/date';

type RoomCardProps = {
  room: MeetingRoom;
  reservations: Reservation[];
  onAddReservation: (roomId: string) => void;
};

/**
 * 회의실 카드 컴포넌트
 */
function RoomCard({ room, reservations, onAddReservation }: RoomCardProps) {
  const roomReservations = reservations.filter((r) => r.roomId === room.id);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{room.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {room.building} {room.floor} · 최대 {room.capacity}명
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => onAddReservation(room.id)}
            className="shrink-0"
          >
            예약 추가
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-2">
          {roomReservations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              예약이 없습니다
            </p>
          ) : (
            roomReservations.map((reservation) => (
              <div
                key={reservation.id}
                className="px-3 py-2 bg-secondary/50 rounded-md text-sm"
              >
                <span className="font-medium">
                  {formatTimeRange(reservation.startAt, reservation.endAt)}
                </span>
                <span className="ml-2 flex items-center gap-1">
                  {reservation.title}
                  {reservation.recurringId && (
                    <Repeat className="w-3 h-3 text-muted-foreground" aria-label="정기예약" />
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default RoomCard;




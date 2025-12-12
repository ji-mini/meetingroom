import { useQuery } from '@tanstack/react-query';
import { roomApi } from '../api/room.api';

function HomePage() {
  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomApi.getRooms,
  });

  if (isLoading) {
    return <div className="text-center py-8">로딩 중...</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">회의실 목록</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms?.map((room) => (
          <div
            key={room.id}
            className="bg-white rounded-lg shadow p-4 border border-gray-200"
          >
            <h3 className="font-medium text-lg">{room.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{room.building} {room.floor}</p>
            <p className="text-sm text-gray-500 mt-1">최대 참석 가능 인원: {room.capacity}명</p>
            <span
              className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                room.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {room.status === 'ACTIVE' ? '사용 가능' : '사용 불가'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HomePage;





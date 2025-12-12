import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import DatePicker from './components/DatePicker';
import ScheduleTimeline from './components/ScheduleTimeline';
import MonthView from './components/MonthView';
import ReservationCancelDialog from './components/ReservationCancelDialog';
import ReservationDetailDialog from './components/ReservationDetailDialog';
import RoomDeleteDialog from './components/RoomDeleteDialog';
import RoomCreateDialog from './components/RoomCreateDialog';
import ReservationModal from './components/ReservationModal';
import UserHeader from './components/UserHeader';
import UserManagementDialog from './components/UserManagementDialog';
import RoomManagementDialog from './components/RoomManagementDialog';
import { Alert } from './components/ui/alert';
import { Label } from './components/ui/label';
import { Switch } from './components/ui/switch';
import apiClient from './api/client';
import { authApi } from './api/auth.api';
import type { MeetingRoom, Reservation, MeResponse } from './types';

function App() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservationToCancel, setReservationToCancel] = useState<Reservation | null>(null);
  const [reservationToView, setReservationToView] = useState<Reservation | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<MeetingRoom | null>(null);
  const [roomCreateOpen, setRoomCreateOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [user, setUser] = useState<MeResponse | null>(null);
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [roomManagementOpen, setRoomManagementOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showMyReservations, setShowMyReservations] = useState(false);
  const [showTeamReservations, setShowTeamReservations] = useState(false);

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  // 예약 필터링 (내 예약, 우리 팀 예약)
  const filteredReservations = useMemo(() => {
    if (!showMyReservations && !showTeamReservations) {
      return reservations; // 필터 없음: 모든 예약 표시
    }

    return reservations.filter((reservation) => {
      // 내 예약 체크
      const isMyReservation = showMyReservations && 
        user?.employeeId && 
        reservation.user?.employeeId === user.employeeId;

      // 우리 팀 예약 체크 (deptId 끼리 비교)
      const isTeamReservation = showTeamReservations && 
        user?.dept && 
        reservation.user?.dept && 
        user.dept === reservation.user.dept;

      // 둘 중 하나라도 조건에 맞으면 표시
      return isMyReservation || isTeamReservation;
    });
  }, [reservations, showMyReservations, showTeamReservations, user]);

  const fetchRooms = async () => {
    try {
      setError(null);
      setLoadingRooms(true);
      const { data } = await apiClient.get<MeetingRoom[]>('/rooms');
      setRooms(data);
    } catch (err) {
      // 조회 API는 로그인 없이도 접근 가능하므로 401 에러는 무시
      if (err instanceof Error && 'response' in err) {
        const axiosError = err as any;
        if (axiosError.response?.status === 401) {
          // 로그인 없이도 조회 가능하므로 에러 표시 안 함
          return;
        }
      }
      setError('회의실 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchReservations = async () => {
    try {
      setError(null);
      setLoadingReservations(true);
      const { data } = await apiClient.get<Reservation[]>('/reservations', {
        params: { date: formattedDate },
      });
      setReservations(data);
    } catch (err) {
      // 조회 API는 로그인 없이도 접근 가능하므로 401 에러는 무시
      if (err instanceof Error && 'response' in err) {
        const axiosError = err as any;
        if (axiosError.response?.status === 401) {
          // 로그인 없이도 조회 가능하므로 에러 표시 안 함
          return;
        }
      }
      setError('예약 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingReservations(false);
    }
  };

  // 로그인 상태 확인
  const checkLoginStatus = async () => {
    try {
      console.log('로그인 상태 확인 시작...');
      const userData = await authApi.getMe();
      console.log('사용자 정보 조회 성공:', userData);
      setUser(userData);
      setIsLoggedIn(true);
      return true;
    } catch (err) {
      console.error('사용자 정보 조회 실패:', err);
      setUser(null);
      setIsLoggedIn(false);
      return false;
    }
  };

  // 최초 진입 시에는 로그인 시도 안 함, 조회만 수행
  useEffect(() => {
    fetchRooms();
    
    // 개발 모드에서는 SSO 로그인 후 리다이렉트 시 항상 로그인 상태 확인
    // (백엔드가 자동으로 첫 번째 ADMIN 계정으로 로그인 처리)
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
    
    if (isDev) {
      // SSO 로그인 후 리다이렉트 확인
      const urlParams = new URLSearchParams(window.location.search);
      const urlParamsObj: Record<string, string> = {};
      urlParams.forEach((value, key) => {
        urlParamsObj[key] = value;
      });
      
      const hasSSOParams = Object.keys(urlParamsObj).length > 0;
      const hasLoginFlag = localStorage.getItem('sso_login_attempt') === 'true';
      
      // URL 파라미터가 있거나, 이전에 로그인 시도한 적이 있으면 로그인 상태 확인
      if (hasSSOParams || hasLoginFlag) {
        console.log('SSO 로그인 후 리다이렉트로 판단, 로그인 상태 확인 시작...');
        localStorage.removeItem('sso_login_attempt'); // 플래그 제거
        
        // 개발 모드에서는 백엔드가 자동으로 첫 번째 ADMIN 계정으로 로그인 처리
        const checkWithRetry = async (retryCount = 0) => {
          const maxRetries = 3;
          const delay = 500; // 500ms씩 증가
          
          const success = await checkLoginStatus();
          
          if (!success && retryCount < maxRetries) {
            console.log(`로그인 상태 확인 실패, ${delay}ms 후 재시도... (${retryCount + 1}/${maxRetries})`);
            setTimeout(() => {
              checkWithRetry(retryCount + 1);
            }, delay);
          } else if (success) {
            console.log('로그인 상태 확인 성공!');
            // URL 파라미터 정리 (리다이렉트 후 깔끔한 URL 유지)
            if (hasSSOParams) {
              const cleanUrl = window.location.origin + window.location.pathname;
              window.history.replaceState({}, '', cleanUrl);
            }
          } else {
            console.log('로그인 상태 확인 최종 실패 - 모든 재시도 완료');
          }
        };
        
        // 첫 시도는 500ms 후에
        setTimeout(() => {
          checkWithRetry();
        }, 500);
      }
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [formattedDate]);

  // 로그인 버튼 클릭 핸들러
  const handleLogin = async () => {
    console.log('로그인 버튼 클릭됨');
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
    
    // 개발 모드에서는 SSO 페이지로 이동하지 않고 바로 로그인 상태 확인 (백엔드 자동 로그인)
    if (isDev) {
      console.log('개발 모드: SSO 로그인 건너뛰고 백엔드 자동 로그인 시도');
      const success = await checkLoginStatus();
      if (success) {
        console.log('개발 모드 로그인 성공 (DEV_USER_EMPLOYEE_ID 또는 기본 계정)');
      } else {
        console.warn('개발 모드 로그인 실패: 백엔드 설정을 확인하세요.');
      }
      return;
    }
    
    // 운영 모드: SSO 로그인 페이지로 이동
    const frontendBaseUrl = window.location.origin + window.location.pathname;
    const returnUrl = encodeURIComponent(frontendBaseUrl);
    const loginUrl = `https://sso.eland.com/eland-portal/login.do?returnURL=${returnUrl}`;
    console.log('SSO 로그인 URL:', loginUrl);
    window.location.href = loginUrl;
  };

  // 로그아웃 후 상태 초기화 및 초기 화면으로 복귀
  const handleLogout = () => {
    // 모든 상태 초기화
    setUser(null);
    setIsLoggedIn(false);
    setReservationToCancel(null);
    setReservationToView(null);
    setRoomToDelete(null);
    setRoomCreateOpen(false);
    setModalOpen(false);
    setSelectedRoomId('');
    setUserManagementOpen(false);
    
    // localStorage 정리
    localStorage.removeItem('sso_login_attempt');
    
    // 예약 목록 새로고침 (로그아웃 상태로 조회)
    fetchReservations();
    
    // 날짜를 오늘로 리셋
    setSelectedDate(new Date());
  };

  const isAdmin = user?.role === 'ADMIN';
  const isLoading = loadingRooms || loadingReservations;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <UserHeader
        isLoggedIn={isLoggedIn}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onCheckLogin={checkLoginStatus}
        onClickManageRooms={() => setRoomManagementOpen(true)}
        onClickManageRoles={() => setUserManagementOpen(true)}
      />
      <div className="container mx-auto px-4 py-10 space-y-8">
        <header className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-center md:text-left space-y-2">
              <p className="text-sm uppercase tracking-wide text-indigo-500 font-semibold">
                Meeting Room Scheduler
              </p>
              <h1 className="text-4xl font-bold text-slate-900">회의실 예약</h1>
              <p className="text-muted-foreground">
                날짜를 선택하고 회의실별 예약 현황을 타임라인으로 확인하세요.
              </p>
            </div>
          </div>
        </header>

        {error && <Alert>{error}</Alert>}

        {/* 달력과 타임라인을 나란히 배치 */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {!isLoading && rooms.length > 0 && (
            <div className="w-full lg:w-auto lg:shrink-0 lg:min-w-[280px]">
              <DatePicker value={selectedDate} onChange={(date) => setSelectedDate(date)} />
            </div>
          )}
          
          <div className="flex-1 w-full min-w-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-muted-foreground">데이터를 불러오는 중입니다...</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-muted-foreground">등록된 회의실이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 예약 필터 토글 */}
                {isLoggedIn && (
                  <div className="flex gap-6 items-center">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={showMyReservations}
                        onCheckedChange={setShowMyReservations}
                      />
                      <Label className="text-sm cursor-pointer" onClick={() => setShowMyReservations(!showMyReservations)}>
                        내 예약 보기
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={showTeamReservations}
                        onCheckedChange={setShowTeamReservations}
                      />
                      <Label className="text-sm cursor-pointer" onClick={() => setShowTeamReservations(!showTeamReservations)}>
                        우리 팀 예약 보기
                      </Label>
                    </div>
                  </div>
                )}

                <ScheduleTimeline
                  rooms={rooms}
                  reservations={filteredReservations}
                  isAdmin={isLoggedIn && isAdmin}
                  isLoggedIn={isLoggedIn}
                  selectedDate={selectedDate}
                  onRequestCancelReservation={(reservation) => {
                    if (!isLoggedIn) return;
                    setReservationToCancel(reservation);
                  }}
                  onRequestViewReservation={(reservation) => setReservationToView(reservation)}
                  onRequestDeleteRoom={(room) => {
                    if (!isLoggedIn || !isAdmin) return;
                    setRoomToDelete(room);
                  }}
                  onRequestAddReservation={(roomId) => {
                    if (!isLoggedIn) return;
                    setSelectedRoomId(roomId);
                    setModalOpen(true);
                  }}
                />

                <div className="mt-12 border-t pt-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">월간 회의실 현황</h2>
                    <p className="text-muted-foreground">특정 회의실의 월간 예약 일정을 확인하세요.</p>
                  </div>
                  <MonthView
                    rooms={rooms}
                    onAddReservation={(date, roomId) => {
                      if (!isLoggedIn) {
                        alert('로그인이 필요합니다.');
                        return;
                      }
                      setSelectedDate(date); // 모달에 전달될 날짜 업데이트
                      setSelectedRoomId(roomId);
                      setModalOpen(true);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReservationCancelDialog
        open={Boolean(reservationToCancel)}
        reservation={reservationToCancel}
        onOpenChange={(open) => {
          if (!open) {
            setReservationToCancel(null);
          }
        }}
        onSuccess={fetchReservations}
      />

      <ReservationDetailDialog
        open={Boolean(reservationToView)}
        reservation={reservationToView}
        isLoggedIn={isLoggedIn}
        currentUser={user}
        onOpenChange={(open) => {
          if (!open) {
            setReservationToView(null);
          }
        }}
        onRequestCancel={(reservation) => setReservationToCancel(reservation)}
      />

      <RoomDeleteDialog
        open={Boolean(roomToDelete)}
        room={roomToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setRoomToDelete(null);
          }
        }}
        onSuccess={() => {
          fetchRooms();
          fetchReservations();
        }}
      />

      <RoomCreateDialog
        open={roomCreateOpen}
        onOpenChange={setRoomCreateOpen}
        onSuccess={() => {
          fetchRooms();
          fetchReservations();
        }}
      />

      <ReservationModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setSelectedRoomId('');
        }}
        roomId={selectedRoomId}
        roomName={rooms.find((r) => r.id === selectedRoomId)?.name}
        rooms={rooms}
        selectedDate={formattedDate}
        onSuccess={fetchReservations}
      />

      {isLoggedIn && isAdmin && (
        <>
          <RoomManagementDialog
            open={roomManagementOpen}
            onOpenChange={setRoomManagementOpen}
            isAdmin={isAdmin}
            onSuccess={() => {
              fetchRooms();
              fetchReservations();
            }}
          />
          <UserManagementDialog
            open={userManagementOpen}
            onOpenChange={setUserManagementOpen}
          />
        </>
      )}
    </div>
  );
}

export default App;

import { User, LogOut, Settings, Users, Monitor, FileText } from 'lucide-react';
import { Button } from './ui/button';
import type { MeResponse } from '../types';

interface UserHeaderProps {
  isLoggedIn: boolean;
  user: MeResponse | null;
  onLogin: () => void;
  onLogout: () => void;
  onCheckLogin: () => Promise<boolean>;
  onClickManageRooms: () => void;
  onClickManageRoles: () => void;
  onClickAuditLogs: () => void;
}

const UserHeader = ({
  isLoggedIn,
  user,
  onLogin,
  onLogout,
  onClickManageRooms,
  onClickManageRoles,
  onClickAuditLogs,
}: UserHeaderProps) => {
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 font-bold text-xl text-indigo-600 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => window.location.href = '/'}
        >
          <Monitor className="w-6 h-6" />
          <span>MeetingRoom</span>
        </div>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                  {user?.name?.[0] || 'U'}
                </div>
                <div className="flex flex-col leading-tight mr-1">
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-900">{user?.name}</span>
                    {user?.role === 'ADMIN' && (
                      <span className="ml-1.5 text-[10px] bg-indigo-600 text-white px-1.5 rounded-full font-bold">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{user?.departmentName || '부서미정'}</span>
                </div>
              </div>
              
              <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block" />

              <div className="flex items-center gap-1">
                {isAdmin && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={onClickManageRooms} 
                      className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 hidden sm:flex"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      회의실 관리
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={onClickManageRoles} 
                      className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 hidden sm:flex"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      사용자 관리
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={onClickAuditLogs} 
                      className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 hidden sm:flex"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      로그 관리
                    </Button>
                  </>
                )}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onLogout} 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-1"
                >
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">로그아웃</span>
                </Button>
              </div>
            </>
          ) : (
            <Button onClick={onLogin} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all">
              <User className="w-4 h-4 mr-2" />
              로그인
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserHeader;

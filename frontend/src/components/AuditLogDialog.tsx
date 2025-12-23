import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { auditApi } from '@/api/audit.api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AuditLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}

const ACTION_MAP: Record<string, { label: string; color: string }> = {
  CREATE: { label: '생성', color: 'bg-green-100 text-green-800' },
  UPDATE: { label: '수정', color: 'bg-blue-100 text-blue-800' },
  DELETE: { label: '삭제', color: 'bg-red-100 text-red-800' },
  CLOSE: { label: '마감', color: 'bg-gray-100 text-gray-800' },
  OPEN: { label: '오픈', color: 'bg-green-100 text-green-800' },
};

const ENTITY_MAP: Record<string, string> = {
  RESERVATION: '예약',
  MEETING_ROOM: '회의실',
  USER: '사용자',
};

export default function AuditLogDialog({ open, onOpenChange, isAdmin }: AuditLogDialogProps) {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string>('ALL');
  const [entity, setEntity] = useState<string>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, action, entity],
    queryFn: () => auditApi.getLogs({
      page,
      limit: 20,
      action: action === 'ALL' ? undefined : action,
      entity: entity === 'ALL' ? undefined : entity,
    }),
    enabled: open && isAdmin,
  });

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>로그 관리</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 mb-4">
          <Select value={action} onValueChange={(val) => { setAction(val); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="작업 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">모든 작업</SelectItem>
              <SelectItem value="CREATE">생성</SelectItem>
              <SelectItem value="UPDATE">수정</SelectItem>
              <SelectItem value="DELETE">삭제</SelectItem>
            </SelectContent>
          </Select>

          <Select value={entity} onValueChange={(val) => { setEntity(val); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="대상" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">모든 대상</SelectItem>
              <SelectItem value="RESERVATION">예약</SelectItem>
              <SelectItem value="MEETING_ROOM">회의실</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-hidden border rounded-md">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">일시</TableHead>
                  <TableHead className="w-[100px]">작업</TableHead>
                  <TableHead className="w-[100px]">대상</TableHead>
                  <TableHead>상세 내용</TableHead>
                  <TableHead className="w-[150px]">작업자</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : data?.logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      로그가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className={ACTION_MAP[log.action]?.color || 'bg-gray-100'}
                        >
                          {ACTION_MAP[log.action]?.label || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ENTITY_MAP[log.entity] || log.entity}
                      </TableCell>
                      <TableCell className="text-sm">
                        <pre className="whitespace-pre-wrap font-mono text-xs bg-muted/50 p-2 rounded">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span className="font-medium">{log.user?.name || '-'}</span>
                          <span className="text-xs text-muted-foreground">
                            {log.user?.departmentName || '-'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            이전
          </Button>
          <span className="flex items-center text-sm">
            {page} / {data?.totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!data || page >= data.totalPages || isLoading}
          >
            다음
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

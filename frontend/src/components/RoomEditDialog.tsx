import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { roomApi } from '@/api/room.api';
import type { MeetingRoom } from '@/types';

type RoomEditDialogProps = {
  open: boolean;
  room: MeetingRoom;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

function RoomEditDialog({ open, room, onOpenChange, onSuccess }: RoomEditDialogProps) {
  const [formValues, setFormValues] = useState({
    name: room.name,
    building: room.building,
    floor: room.floor,
    capacity: room.capacity,
    hasMonitor: room.hasMonitor || false,
    hasProjector: room.hasProjector || false,
  });
  const [error, setError] = useState<string | null>(null);

  // room이 변경되면 폼 값 업데이트
  useEffect(() => {
    if (room) {
      setFormValues({
        name: room.name,
        building: room.building,
        floor: room.floor,
        capacity: room.capacity,
        hasMonitor: room.hasMonitor || false,
        hasProjector: room.hasProjector || false,
      });
      setError(null);
    }
  }, [room]);

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; building?: string; floor?: string; capacity?: number; hasMonitor?: boolean; hasProjector?: boolean }) =>
      roomApi.updateRoom(room.id, data),
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      console.error('회의실 수정 실패', err);
      setError(err.response?.data?.message || '회의실 수정 중 오류가 발생했습니다.');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: name === 'capacity' ? Number(value) : value,
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formValues.name.trim()) {
      setError('회의실 이름을 입력해주세요.');
      return false;
    }
    if (!Number.isFinite(formValues.capacity) || formValues.capacity <= 0) {
      setError('최대 참석 가능 인원은 1명 이상이어야 합니다.');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    updateMutation.mutate({
      name: formValues.name.trim(),
      building: formValues.building.trim(),
      floor: formValues.floor.trim(),
      capacity: formValues.capacity,
      hasMonitor: formValues.hasMonitor,
      hasProjector: formValues.hasProjector,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>회의실 수정</DialogTitle>
          <DialogDescription>
            회의실 정보를 수정하고 저장을 눌러주세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">회의실 이름 *</Label>
            <Input
              id="edit-name"
              name="name"
              placeholder="예: A동 301"
              value={formValues.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-building">건물 *</Label>
              <Input
                id="edit-building"
                name="building"
                placeholder="예: 본사"
                value={formValues.building}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-floor">층 *</Label>
              <Input
                id="edit-floor"
                name="floor"
                placeholder="예: 3층"
                value={formValues.floor}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-capacity">최대 참석 가능 인원 *</Label>
            <Input
              id="edit-capacity"
              name="capacity"
              type="number"
              min={1}
              value={formValues.capacity}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex gap-6 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="edit-hasMonitor" 
                checked={formValues.hasMonitor}
                onCheckedChange={(checked) => 
                  setFormValues(prev => ({ ...prev, hasMonitor: checked === true }))
                }
              />
              <Label htmlFor="edit-hasMonitor" className="cursor-pointer">모니터 있음</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="edit-hasProjector" 
                checked={formValues.hasProjector}
                onCheckedChange={(checked) => 
                  setFormValues(prev => ({ ...prev, hasProjector: checked === true }))
                }
              />
              <Label htmlFor="edit-hasProjector" className="cursor-pointer">빔프로젝터 있음</Label>
            </div>
          </div>

          {error && <Alert>{error}</Alert>}

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={updateMutation.isPending}>
                취소
              </Button>
            </DialogClose>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RoomEditDialog;


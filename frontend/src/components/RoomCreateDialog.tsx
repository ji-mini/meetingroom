import { useState } from 'react';
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

export type NewRoomFormValues = {
  name: string;
  building: string;
  floor: string;
  capacity: number;
  hasMonitor: boolean;
  hasProjector: boolean;
};

type RoomCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

function RoomCreateDialog({ open, onOpenChange, onSuccess }: RoomCreateDialogProps) {
  const [formValues, setFormValues] = useState<NewRoomFormValues>({
    name: '',
    building: '',
    floor: '',
    capacity: 1,
    hasMonitor: false,
    hasProjector: false,
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: roomApi.createRoom,
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
      setFormValues({ 
        name: '', 
        building: '', 
        floor: '', 
        capacity: 1,
        hasMonitor: false,
        hasProjector: false,
      });
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      console.error('회의실 생성 실패', err);
      setError(err.response?.data?.message || '회의실 생성 중 오류가 발생했습니다.');
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
    if (!formValues.building.trim()) {
      setError('건물을 입력해주세요.');
      return false;
    }
    if (!formValues.floor.trim()) {
      setError('층을 입력해주세요.');
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
    createMutation.mutate({
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
          <DialogTitle>회의실 추가</DialogTitle>
          <DialogDescription>
            새 회의실 정보를 입력하고 저장을 눌러주세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">회의실 이름 *</Label>
            <Input
              id="name"
              name="name"
              placeholder="예: A동 301"
              value={formValues.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">최대 참석 가능 인원 *</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              value={formValues.capacity}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="building">건물 *</Label>
              <Input
                id="building"
                name="building"
                placeholder="예: C동"
                value={formValues.building}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor">층 *</Label>
              <Input
                id="floor"
                name="floor"
                placeholder="예: 3층"
                value={formValues.floor}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="flex gap-6 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="hasMonitor" 
                checked={formValues.hasMonitor}
                onCheckedChange={(checked) => 
                  setFormValues(prev => ({ ...prev, hasMonitor: checked === true }))
                }
              />
              <Label htmlFor="hasMonitor" className="cursor-pointer">모니터 있음</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="hasProjector" 
                checked={formValues.hasProjector}
                onCheckedChange={(checked) => 
                  setFormValues(prev => ({ ...prev, hasProjector: checked === true }))
                }
              />
              <Label htmlFor="hasProjector" className="cursor-pointer">빔프로젝터 있음</Label>
            </div>
          </div>

          {error && <Alert>{error}</Alert>}

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={createMutation.isPending}>
                취소
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RoomCreateDialog;




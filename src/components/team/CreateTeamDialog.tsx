/**
 * Create team dialog component
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useTeam } from './TeamProvider';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTeamDialog({
  open,
  onOpenChange,
}: CreateTeamDialogProps) {
  const { createTeam } = useTeam();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('团队名称不能为空');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createTeam({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });

      // 重置表单并关闭对话框
      setFormData({ name: '', description: '' });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating team:', error);
      setError(error instanceof Error ? error.message : '创建团队失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '' });
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>创建新团队</DialogTitle>
          <DialogDescription>
            创建一个新的团队来管理您的日历事件。您将成为团队的所有者。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">团队名称 *</Label>
            <Input
              id="name"
              placeholder="输入团队名称"
              value={formData.name}
              onChange={e =>
                setFormData(prev => ({ ...prev, name: e.target.value }))
              }
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">团队描述</Label>
            <Input
              id="description"
              placeholder="输入团队描述（可选）"
              value={formData.description}
              onChange={e =>
                setFormData(prev => ({ ...prev, description: e.target.value }))
              }
              disabled={loading}
            />
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <LoadingSpinner className="mr-2 h-4 w-4" />}
              创建团队
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

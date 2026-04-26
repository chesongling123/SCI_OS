import { useQuery } from '@tanstack/react-query';
import { authHeaders } from '../lib/api';
import type { NoteResponseDto } from '@research/shared-types';

export type NoteListItem = Pick<
  NoteResponseDto,
  'id' | 'title' | 'folderId' | 'tags' | 'isPinned' | 'isArchived' | 'updatedAt' | 'createdAt'
> & {
  folderName?: string | null;
};

/**
 * 获取笔记列表
 * 后端默认按 isPinned desc, updatedAt desc 排序
 */
export function useNotes(params?: { folderId?: string | null; q?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.folderId) searchParams.set('folderId', params.folderId);
  if (params?.q) searchParams.set('q', params.q);
  const qs = searchParams.toString();

  return useQuery<NoteListItem[]>({
    queryKey: ['notes', params],
    queryFn: async () => {
      const res = await fetch(`/api/v1/notes${qs ? '?' + qs : ''}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('获取笔记列表失败');
      return res.json();
    },
  });
}

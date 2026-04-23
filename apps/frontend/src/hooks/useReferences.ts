import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateReferenceDto,
  UpdateReferenceDto,
  ReferenceResponseDto,
  ReferenceFolderResponseDto,
  CreateReferenceFolderDto,
  UpdateReferenceFolderDto,
} from '@phd/shared-types';
import { authHeaders } from '../lib/api';

const API_BASE = '/api/v1/references';
const FOLDER_API_BASE = '/api/v1/references/folders';

// 获取文献列表
export function useReferences(params?: {
  status?: string;
  priority?: number;
  folderId?: string;
  tag?: string;
  q?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.priority) searchParams.set('priority', String(params.priority));
  if (params?.folderId) searchParams.set('folderId', params.folderId);
  if (params?.tag) searchParams.set('tag', params.tag);
  if (params?.q) searchParams.set('q', params.q);
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const queryString = searchParams.toString();
  return useQuery<{ data: ReferenceResponseDto[]; nextCursor: string | null; hasMore: boolean }>({
    queryKey: ['references', params],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}${queryString ? `?${queryString}` : ''}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error('登录已过期，请重新登录');
        const body = await res.text().catch(() => '');
        throw new Error(`获取文献列表失败 (${res.status}): ${body.slice(0, 100)}`);
      }
      return res.json();
    },
  });
}

// 获取单篇文献详情
export function useReference(id: string) {
  return useQuery<ReferenceResponseDto>({
    queryKey: ['reference', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('获取文献详情失败');
      return res.json();
    },
    enabled: !!id,
  });
}

// 创建文献
export function useCreateReference() {
  const queryClient = useQueryClient();
  return useMutation<ReferenceResponseDto, Error, CreateReferenceDto>({
    mutationFn: async (dto) => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('创建文献失败');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references'] });
    },
  });
}

// 更新文献
export function useUpdateReference() {
  const queryClient = useQueryClient();
  return useMutation<ReferenceResponseDto, Error, { id: string; dto: UpdateReferenceDto }>({
    mutationFn: async ({ id, dto }) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('更新文献失败');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['references'] });
      queryClient.invalidateQueries({ queryKey: ['reference', variables.id] });
    },
  });
}

// 更新阅读状态
export function useUpdateReadingStatus() {
  const queryClient = useQueryClient();
  return useMutation<ReferenceResponseDto, Error, { id: string; status: string }>({
    mutationFn: async ({ id, status }) => {
      const res = await fetch(`${API_BASE}/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ readingStatus: status }),
      });
      if (!res.ok) throw new Error('更新阅读状态失败');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['references'] });
      queryClient.invalidateQueries({ queryKey: ['reference', variables.id] });
    },
  });
}

// 删除文献
export function useDeleteReference() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: authHeaders(false) });
      if (!res.ok) throw new Error('删除文献失败');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references'] });
    },
  });
}

// 上传 PDF
export function useUploadPdf() {
  const queryClient = useQueryClient();
  return useMutation<ReferenceResponseDto, Error, { file: File; folderId?: string; tags?: string }>({
    mutationFn: async ({ file, folderId, tags }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) formData.append('folderId', folderId);
      if (tags) formData.append('tags', tags);

      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: authHeaders(false), // multipart 不要 Content-Type
        body: formData,
      });
      if (!res.ok) throw new Error('上传 PDF 失败');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references'] });
    },
  });
}

// ========== 文件夹 ==========

export function useReferenceFolders() {
  return useQuery<ReferenceFolderResponseDto[]>({
    queryKey: ['reference-folders'],
    queryFn: async () => {
      const res = await fetch(`${FOLDER_API_BASE}/all`, { headers: authHeaders() });
      if (!res.ok) throw new Error('获取文件夹列表失败');
      return res.json();
    },
  });
}

export function useCreateReferenceFolder() {
  const queryClient = useQueryClient();
  return useMutation<ReferenceFolderResponseDto, Error, CreateReferenceFolderDto>({
    mutationFn: async (dto) => {
      const res = await fetch(FOLDER_API_BASE, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('创建文件夹失败');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-folders'] });
    },
  });
}

export function useDeleteReferenceFolder() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`${FOLDER_API_BASE}/${id}`, { method: 'DELETE', headers: authHeaders(false) });
      if (!res.ok) throw new Error('删除文件夹失败');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-folders'] });
      queryClient.invalidateQueries({ queryKey: ['references'] });
    },
  });
}

// ========== 文献批注 ==========

export function useReferenceNotes(referenceId: string) {
  return useQuery<Array<{
    id: string;
    pageNumber: number;
    text: string | null;
    color: string;
    content: string;
    createdAt: string;
  }>>({
    queryKey: ['reference-notes', referenceId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/${referenceId}/notes`, { headers: authHeaders() });
      if (!res.ok) throw new Error('获取批注失败');
      return res.json();
    },
    enabled: !!referenceId,
  });
}

export function useCreateReferenceNote() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, { referenceId: string; data: { pageNumber: number; text?: string; color?: string; content: string } }>({
    mutationFn: async ({ referenceId, data }) => {
      const res = await fetch(`${API_BASE}/${referenceId}/notes`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('添加批注失败');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reference-notes', variables.referenceId] });
    },
  });
}

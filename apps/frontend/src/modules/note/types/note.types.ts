export interface Note {
  id: string;
  title: string;
  content: Record<string, unknown>;
  plainText: string;
  summary: string | null;
  tags: string[];
  folderId: string | null;
  referenceId: string | null;
  reference?: { id: string; title: string } | null;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteListItem {
  id: string;
  title: string;
  plainText: string;
  summary: string | null;
  tags: string[];
  folderId: string | null;
  referenceId: string | null;
  reference?: { id: string; title: string } | null;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

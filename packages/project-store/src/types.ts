/**
 * project-store type definitions.
 * Mirrors the cloud project model, implemented on the local filesystem.
 */

// ────────────────────────────────────────────────────────────
// Tool types
// ────────────────────────────────────────────────────────────

export interface ToolActivity {
  name: string
  summary: string
  isError?: boolean
  /** Tool input (JSON-serialized; truncated by the store layer) */
  input?: string
  /** Tool output (truncated by the store layer) */
  output?: string
}

/** Attachment metadata recorded with a user message (reference only, no bytes; moving/deleting the file just breaks the link) */
export interface ChatAttachment {
  name: string
  /** Absolute local path (if any) */
  path?: string
  /** Lowercase extension, no dot */
  ext?: string
  sizeBytes?: number
}

// ────────────────────────────────────────────────────────────
// Message structures
// ────────────────────────────────────────────────────────────

/**
 * One JSONL line corresponds to one message.
 * ts: UTC ISO string
 * seq: monotonically increasing integer within a chat (maintained by the store; the renderer sorts by seq)
 * attachments: not implemented in P0, field reserved only
 */
export interface ChatMessage {
  seq: number
  ts: string
  role: 'user' | 'assistant'
  text: string
  /** File path associated with the message */
  fileRef?: string
  /** Tool activity (with truncated inputs/outputs) */
  tools?: ToolActivity[]
  /** Attachment metadata of a user message */
  attachments?: ChatAttachment[]
  /** Document selection a user message targeted */
  scope?: ChatScope
}

/** What a user message was scoped to: a caption plus an excerpt of the selected content */
export interface ChatScope {
  label: string
  text?: string
}

// ────────────────────────────────────────────────────────────
// Project & index structures
// ────────────────────────────────────────────────────────────

export interface ProjectInfo {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface ProjectData extends ProjectInfo {
  files: string[]
}

export interface ProjectIndex {
  projects: ProjectInfo[]
  /** absolute path → projectId */
  fileMap: Record<string, string>
  /**
   * Absolute path → stable chatId (registered on first resolve).
   * Once assigned, a chatId never changes with the path; renaming/moving a file
   * only updates the key here, so history follows the file.
   * Old data without this map falls back to sha256(path) derivation.
   */
  chatIdByPath?: Record<string, string>
  /**
   * Absolute path → file incarnation signature of the file the chatId was
   * bound to (same keys as chatIdByPath). Deleting or replacing the file
   * changes the signature, so the next resolve mints a fresh chat instead of
   * letting an unrelated file inherit the transcript (#1021). Renames keep
   * the signature, so history still follows the file.
   */
  chatSigByPath?: Record<string, ChatFileSig>
}

/**
 * File-object identity bound to a chat: the inode and creation time of the
 * file the mapping was registered against. In-place edits keep both values,
 * atomic rewrites (tmp + rename-over) change both. Fields reported as 0 by
 * the filesystem (no inode on FAT, no birthtime on some Linux mounts) are
 * treated as not comparable.
 */
export interface ChatFileSig {
  /** inode / file index */
  i?: number
  /** birthtime (file creation) in milliseconds */
  b?: number
}

export interface ChatMeta {
  chatId: string
  /** Last modification time of the JSONL file (UTC ISO) */
  updatedAt: string
  /** Approximate line count (estimated from file bytes, not exact) */
  approxCount: number
  /** The first thing asked in the thread, read from the file's head */
  firstQuestion?: string
}

/** Title/preview sidecar for one chat (stored in chats-titles.json per project) */
export interface ChatTitleInfo {
  title: string
  preview: string
  /** provider the chat ran with (history is written for VEGA chats) */
  provider?: string
  updatedAt: string
}

/** One history-list row: a chat session with its title and owning file */
export interface ChatSession {
  projectId: string
  chatId: string
  title: string
  preview: string
  /** absolute file path the chat belongs to ('' when unknown) */
  filePath: string
  fileName: string
  updatedAt: string
  provider?: string
  approxCount: number
}

/** Filter for listChatSessions */
export interface ChatSessionQuery {
  /** restrict to one project; omit for the global (cross-file) history */
  projectId?: string
  /** case-insensitive substring over title + preview + file name */
  query?: string
  limit?: number
}

// ────────────────────────────────────────────────────────────
// Extended API types (P1)
// ────────────────────────────────────────────────────────────

/**
 * Summary info returned by listProjects() (with aggregated fields)
 */
export interface ProjectSummary extends ProjectInfo {
  /** Number of files currently belonging to this project */
  fileCount: number
  /** Last active time: max of project.json updatedAt and all chat mtimes */
  lastActiveAt: string
  /** Whether this is the default project (cannot be deleted/renamed) */
  isDefault: boolean
}

/**
 * Project timeline entry: aggregates messages from all chats in a project, sorted by ts descending
 */
export interface TimelineEntry {
  /** Absolute file path (the file this chat belongs to) */
  filePath: string
  /** File name (basename) */
  fileName: string
  /** chat id */
  chatId: string
  /** Message time (UTC ISO) */
  ts: string
  /** Message sender */
  role: 'user' | 'assistant'
  /** First line of the message text (up to 120 chars) */
  preview: string
  /** Message seq within the chat */
  seq: number
}

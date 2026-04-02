export type UserRole = "admin" | "editor" | "viewer";
export type ProjectStatus = "draft" | "in_progress" | "review" | "completed" | "archived";
export type BookType = "novel" | "non_fiction" | "children" | "academic" | "poetry" | "comic" | "other";
export type PageSize = "A4" | "A5" | "US_Letter" | "US_Trade" | "Digest" | "Custom";
export type ChatRole = "user" | "assistant" | "system";
export type SharePermission = "view" | "comment";
export type ActivityAction =
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "style_applied"
  | "style_updated"
  | "content_imported"
  | "export_generated"
  | "template_created"
  | "template_updated"
  | "share_link_created"
  | "comment_added"
  | "comment_resolved"
  | "user_invited"
  | "user_role_changed";

export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  google_id: string | null;
  google_refresh_token: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbProject {
  id: string;
  name: string;
  description: string | null;
  book_type: BookType;
  status: ProjectStatus;
  page_size: PageSize;
  page_count: number | null;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProjectContent {
  id: string;
  project_id: string;
  content_tree: Record<string, unknown>;
  source: string;
  source_id: string | null;
  version: number;
  created_at: string;
}

export interface DbProjectStyles {
  id: string;
  project_id: string;
  css_content: string;
  version: number;
  created_by: string | null;
  created_at: string;
}

export interface DbTemplate {
  id: string;
  name: string;
  description: string | null;
  book_type: BookType;
  css_content: string;
  thumbnail_url: string | null;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbChatConversation {
  id: string;
  project_id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbChatMessage {
  id: string;
  conversation_id: string;
  role: ChatRole;
  content: string;
  token_count: number | null;
  created_at: string;
}

export interface DbShareLink {
  id: string;
  project_id: string;
  token: string;
  password_hash: string | null;
  expires_at: string | null;
  permissions: SharePermission;
  created_by: string | null;
  created_at: string;
}

export interface DbComment {
  id: string;
  project_id: string;
  page_number: number;
  x_position: number;
  y_position: number;
  content: string;
  author_name: string;
  author_id: string | null;
  share_link_id: string | null;
  resolved: boolean;
  created_at: string;
}

export interface DbActivityLog {
  id: string;
  project_id: string | null;
  user_id: string | null;
  action: ActivityAction;
  details: Record<string, unknown>;
  created_at: string;
}

export interface DbProjectAsset {
  id: string;
  project_id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: { Row: DbUser; Insert: Omit<DbUser, "id" | "created_at" | "updated_at">; Update: Partial<Omit<DbUser, "id" | "created_at">> };
      projects: { Row: DbProject; Insert: Omit<DbProject, "id" | "created_at" | "updated_at">; Update: Partial<Omit<DbProject, "id" | "created_at">> };
      project_content: { Row: DbProjectContent; Insert: Omit<DbProjectContent, "id" | "created_at">; Update: Partial<Omit<DbProjectContent, "id" | "created_at">> };
      project_styles: { Row: DbProjectStyles; Insert: Omit<DbProjectStyles, "id" | "created_at">; Update: Partial<Omit<DbProjectStyles, "id" | "created_at">> };
      templates: { Row: DbTemplate; Insert: Omit<DbTemplate, "id" | "created_at" | "updated_at">; Update: Partial<Omit<DbTemplate, "id" | "created_at">> };
      chat_conversations: { Row: DbChatConversation; Insert: Omit<DbChatConversation, "id" | "created_at" | "updated_at">; Update: Partial<Omit<DbChatConversation, "id" | "created_at">> };
      chat_messages: { Row: DbChatMessage; Insert: Omit<DbChatMessage, "id" | "created_at">; Update: never };
      share_links: { Row: DbShareLink; Insert: Omit<DbShareLink, "id" | "created_at" | "token">; Update: Partial<Omit<DbShareLink, "id" | "created_at">> };
      comments: { Row: DbComment; Insert: Omit<DbComment, "id" | "created_at">; Update: Partial<Omit<DbComment, "id" | "created_at">> };
      activity_log: { Row: DbActivityLog; Insert: Omit<DbActivityLog, "id" | "created_at">; Update: never };
      project_assets: { Row: DbProjectAsset; Insert: Omit<DbProjectAsset, "id" | "created_at">; Update: never };
    };
  };
}

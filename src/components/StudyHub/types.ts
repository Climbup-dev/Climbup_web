export interface Subject {
  id: string;
  subject_name: string;
}

export interface Topic {
  classroom_id: string;
  topic_name: string;
  status?: string;
  created_at?: string;
  pdf_url?: string;
  category?: string;
  is_personal?: boolean;
  sender_name?: string;
  original_resource_id?: string;
}

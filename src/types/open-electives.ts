export interface OpenElectiveBasket {
  oe_id: string;
  semester: number;
  subject_id: string;
  board_code: string;
  course_code: string;
  display_order: number;
  academic_year: string | null;
  is_active: boolean;
  subjects?: {
    subject_id: string;
    subject_name: string;
    subject_code: string;
  };
}

export interface StudentOpenElective {
  selection_id: string;
  user_id: string;
  oe_id: string;
  semester: number;
  selected_at: string;
}

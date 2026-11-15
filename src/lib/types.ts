export type Settings = {
  group_name: string;
  budget: string | null;
  exchange_date: string | null;
  max_questions: number;
  invite_code: string;
  drawn_at: string | null;
};

export type Member = {
  id: string;
  display_name: string;
  is_admin: boolean;
};

export type WishlistItem = {
  id: number;
  member_id: string;
  title: string;
  url: string | null;
  note: string | null;
};

export type Message = {
  id: number;
  recipient_id: string;
  question_number: number | null;
  question_id: number | null;
  body: string;
  created_at: string;
};

/** Returned by Server Actions used with `useActionState`. */
export type FormState = { error?: string; message?: string } | null;

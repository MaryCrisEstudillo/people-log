/** Which list page a detail/form was opened from, so Back/Cancel/Save return there. */
export type From = 'home' | 'all';

export type View =
  | { name: 'home' }
  | { name: 'all' }
  | { name: 'detail'; id: number; from: From }
  | { name: 'form'; id?: number; from: From };

export type Go = (view: View) => void;

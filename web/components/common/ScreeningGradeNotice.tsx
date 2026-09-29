import type { ReactNode } from 'react';

export interface ScreeningGradeNoticeProps {
  /** Notice text; defaults to the API's `screening_grade` string when passed through. */
  notice?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    label?: string;
    text?: string;
  };
}

const DEFAULT_NOTICE =
  'Screening Grade: Cell-level screening and prioritisation tool. Geotechnical investigation, hydraulic study, and community consultation required before executing relocation orders.';

/**
 * Persistent screening-grade label (FR-10.8, NFR-8).
 *
 * Required on every output surface — the scores rank cells for investigation, they do not
 * authorise a relocation order.
 */
export const ScreeningGradeNotice = ({}: ScreeningGradeNoticeProps) => null;

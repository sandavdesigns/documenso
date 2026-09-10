import type { HTMLAttributes, ReactNode } from 'react';

export type DocumentShareButtonProps = HTMLAttributes<HTMLButtonElement> & {
  token?: string;
  documentId: number;
  trigger?: (_props: { loading: boolean; disabled: boolean }) => ReactNode;
};

export const DocumentShareButton = (_props: DocumentShareButtonProps) => null;

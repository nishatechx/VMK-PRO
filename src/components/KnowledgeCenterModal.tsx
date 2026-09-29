import React from 'react';
import { CeraKnowledgeCenterModal } from './cera/CeraKnowledgeCenterModal';
import { UserProfile } from '../types/auth';

export interface KnowledgeCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  initialDocumentId?: string;
}

export const KnowledgeCenterModal: React.FC<KnowledgeCenterModalProps> = (props) => {
  return <CeraKnowledgeCenterModal {...props} />;
};

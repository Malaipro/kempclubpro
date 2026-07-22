import React from 'react';
import { ParticipantTagsSection } from './ParticipantTagsSection';
import { QuickStatusActions } from './QuickStatusActions';
import { ParticipantNotesSection } from './ParticipantNotesSection';
import { ParticipantHistoryTab } from './ParticipantHistoryTab';
import { CoachingTypeToggle } from './CoachingTypeToggle';

interface Props {
  userId: string;
  currentStatus: string | null;
  currentStreamId: string | null;
  onChanged?: () => void;
}

/**
 * Единый CRM-блок карточки участника: теги, быстрые действия по статусу,
 * заметки и лента истории. Используется как на отдельной странице
 * /admin/view-participant/:id, так и в инлайн-разворачивании списка.
 */
export const ParticipantCRMBlock: React.FC<Props> = ({
  userId, currentStatus, currentStreamId, onChanged,
}) => {
  return (
    <div className="space-y-4">
      <ParticipantTagsSection userId={userId} />
      <CoachingTypeToggle userId={userId} onChanged={onChanged} />
      <QuickStatusActions
        userId={userId}
        currentStatus={currentStatus}
        currentStreamId={currentStreamId}
        onChanged={() => onChanged?.()}
      />
      <ParticipantNotesSection userId={userId} />
      <ParticipantHistoryTab userId={userId} />
    </div>
  );
};

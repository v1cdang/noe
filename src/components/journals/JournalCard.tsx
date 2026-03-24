'use client';

import Link from 'next/link';
import type { JournalListItemDto } from '@/lib/journals/types';
import { formatJournalDate } from '@/lib/journals/format-journal-date';
import { getFirstLines, truncateOneLine } from '@/lib/journals/truncate-journal-text';

type JournalCardProps = {
  readonly journal: JournalListItemDto;
};

export default function JournalCard({ journal }: Readonly<JournalCardProps>): React.ReactElement {
  const preview: string = getFirstLines(journal.content, 2);
  const promptLine: string = truncateOneLine(journal.prompt, 96);
  const dateLabel: string = formatJournalDate(journal.created_at);

  return (
    <Link className="journalCard" href={`/journals/${journal.id}`}>
      <div className="journalCardTop">
        <time className="journalCardDate" dateTime={journal.created_at}>
          {dateLabel}
        </time>
        {journal.is_pinned ? <span className="journalPinBadge">Pinned</span> : null}
        {journal.mood ? (
          <span className="journalMoodEmoji" aria-hidden="true">
            {journal.mood}
          </span>
        ) : null}
      </div>
      <p className="journalCardPrompt">{promptLine}</p>
      {preview.length > 0 ? (
        <p className="journalCardPreview">{preview}</p>
      ) : (
        <p className="journalCardPreview journalCardPreviewEmpty">No notes for this entry.</p>
      )}
    </Link>
  );
}

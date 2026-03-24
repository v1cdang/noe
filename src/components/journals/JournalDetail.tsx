'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useDeleteJournal, useJournalDetail, useUpdateJournal } from '@/lib/journals/use-journal-queries';
import { formatJournalDate } from '@/lib/journals/format-journal-date';

type JournalDetailProps = {
  readonly journalId: string;
};

export default function JournalDetail({ journalId }: Readonly<JournalDetailProps>): React.ReactElement {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useJournalDetail(journalId);
  const updateJournal = useUpdateJournal();
  const deleteJournal = useDeleteJournal();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string>('');
  const [draftPrompt, setDraftPrompt] = useState<string>('');
  const [draftMood, setDraftMood] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const journal = data?.journal;

  const beginEdit = useCallback(() => {
    if (!journal) {
      return;
    }
    setDraftContent(journal.content);
    setDraftPrompt(journal.prompt);
    setDraftMood(journal.mood ?? '');
    setIsEditing(true);
  }, [journal]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!journal) {
      return;
    }
    const moodTrimmed: string = draftMood.trim();
    await updateJournal.mutateAsync({
      id: journal.id,
      body: {
        content: draftContent,
        prompt: draftPrompt,
        mood: moodTrimmed.length > 0 ? moodTrimmed : null
      }
    });
    setIsEditing(false);
  }, [draftContent, draftMood, draftPrompt, journal, updateJournal]);

  const onTogglePin = useCallback(async () => {
    if (!journal) {
      return;
    }
    await updateJournal.mutateAsync({
      id: journal.id,
      body: { is_pinned: !journal.is_pinned }
    });
  }, [journal, updateJournal]);

  const onConfirmDelete = useCallback(async () => {
    if (!journal) {
      return;
    }
    await deleteJournal.mutateAsync(journal.id);
    router.replace('/journals');
  }, [deleteJournal, journal, router]);

  const dateLabel: string = useMemo(() => (journal ? formatJournalDate(journal.created_at) : ''), [journal]);

  if (isLoading) {
    return (
      <section className="page journalPage">
        <div className="journalDetailSkeleton cardBlock">
          <div className="journalSkeletonLine journalSkeletonLineShort" />
          <div className="journalSkeletonLine journalSkeletonLineMid" />
          <div className="journalSkeletonLine journalSkeletonLineTall" />
        </div>
      </section>
    );
  }

  if (isError || !journal) {
    return (
      <section className="page journalPage">
        <p className="errorText" role="alert">
          {error instanceof Error ? error.message : 'Journal not found.'}
        </p>
        <div className="ctaRow">
          <button className="secondaryButton" type="button" onClick={() => void refetch()}>
            Retry
          </button>
          <Link className="navLink" href="/journals">
            Back to journals
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page journalPage">
      <div className="rowBetween">
        <Link className="navLink journalBackLink" href="/journals">
          ← All journals
        </Link>
        <div className="journalToolbar">
          <button
            className="secondaryButton journalToolbarButton"
            type="button"
            onClick={() => void onTogglePin()}
            disabled={updateJournal.isPending}
          >
            {journal.is_pinned ? 'Unpin' : 'Pin'}
          </button>
          {!isEditing ? (
            <button className="secondaryButton journalToolbarButton" type="button" onClick={beginEdit}>
              Edit
            </button>
          ) : null}
        </div>
      </div>

      <header className="journalDetailHeader">
        <time className="journalDetailDate" dateTime={journal.created_at}>
          {dateLabel}
        </time>
        {journal.mood ? (
          <span className="journalDetailMood" aria-label="Mood">
            {journal.mood}
          </span>
        ) : null}
      </header>

      {!isEditing ? (
        <>
          <h1 className="journalDetailPrompt">{journal.prompt}</h1>
          <article className="journalDetailBody">
            {journal.content.trim().length > 0 ? (
              <p className="journalDetailContent">{journal.content}</p>
            ) : (
              <p className="mutedText">No notes for this entry.</p>
            )}
          </article>
        </>
      ) : (
        <div className="journalEditForm cardBlock">
          <label className="fieldLabel">
            Prompt
            <textarea
              className="textArea"
              rows={3}
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
            />
          </label>
          <label className="fieldLabel">
            Notes
            <textarea
              className="textArea"
              rows={10}
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
            />
          </label>
          <label className="fieldLabel">
            Mood (emoji or text, optional)
            <input
              className="fieldInput"
              type="text"
              value={draftMood}
              onChange={(e) => setDraftMood(e.target.value)}
              placeholder="e.g. 🙂"
            />
          </label>
          <div className="ctaRow journalEditActions">
            <button
              className="primaryButton"
              type="button"
              onClick={() => void saveEdit()}
              disabled={updateJournal.isPending}
            >
              {updateJournal.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              className="secondaryButton"
              type="button"
              onClick={cancelEdit}
              disabled={updateJournal.isPending}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isEditing ? (
        <div className="journalDangerZone">
          <button
            className="dangerButton"
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteJournal.isPending}
          >
            Delete entry
          </button>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div className="journalModalOverlay" role="presentation">
          <div
            className="journalModal cardBlock"
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-delete-title"
          >
            <h2 id="journal-delete-title" className="sectionTitle">
              Delete this journal?
            </h2>
            <p className="mutedText">This cannot be undone.</p>
            <div className="ctaRow">
              <button
                className="dangerButton"
                type="button"
                onClick={() => void onConfirmDelete()}
                disabled={deleteJournal.isPending}
              >
                {deleteJournal.isPending ? 'Deleting…' : 'Delete'}
              </button>
              <button
                className="secondaryButton"
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteJournal.isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

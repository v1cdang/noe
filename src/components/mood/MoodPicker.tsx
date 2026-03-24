'use client';

import type { MoodScore } from '@/lib/journaling/types';

type MoodPickerProps = {
  selectedMoodScore: MoodScore | null;
  onSelectMoodScore: (nextMoodScore: MoodScore) => void;
};

const MOODS: Array<{ score: MoodScore; emoji: string; label: string }> = [
  { score: 1, emoji: '😞', label: 'Very bad' },
  { score: 2, emoji: '😕', label: 'Bad' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '🙂', label: 'Good' },
  { score: 5, emoji: '😄', label: 'Great' }
];

export default function MoodPicker({
  selectedMoodScore,
  onSelectMoodScore
}: Readonly<MoodPickerProps>): React.ReactElement {
  return (
    <fieldset className="cardBlock" aria-label="Mood selection">
      <legend className="sectionTitle">How do you feel?</legend>
      <div className="moodGrid" role="radiogroup" aria-label="Mood score scale 1 to 5">
        {MOODS.map((mood) => {
          const isSelected: boolean = selectedMoodScore === mood.score;
          return (
            <button
              key={mood.score}
              className={`moodButton ${isSelected ? 'moodButtonSelected' : ''}`}
              type="button"
              onClick={() => onSelectMoodScore(mood.score)}
              aria-pressed={isSelected}
              aria-label={`${mood.label} (${mood.score}/5)`}
            >
              <span className="moodEmoji" aria-hidden="true">
                {mood.emoji}
              </span>
              <span className="moodScore">{mood.score}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}


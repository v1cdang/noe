'use client';

import type { PromptDto } from '@/lib/journaling/types';

type PromptCardProps = {
  prompt: PromptDto;
  isSelected: boolean;
  onSelectPrompt: () => void;
};

export default function PromptCard({
  prompt,
  isSelected,
  onSelectPrompt
}: Readonly<PromptCardProps>): React.ReactElement {
  return (
    <button
      type="button"
      className={`promptCard ${isSelected ? 'promptCardSelected' : ''}`}
      onClick={onSelectPrompt}
      aria-pressed={isSelected}
    >
      <div className="promptMeta">
        <span className="promptSource">{prompt.source === 'custom' ? 'Custom' : 'Prompt'}</span>
        {prompt.category ? <span className="promptCategory">{prompt.category}</span> : null}
      </div>
      <div className="promptText">{prompt.promptText}</div>
    </button>
  );
}


'use client';

import AuthGate from '@/components/auth/AuthGate';
import JournalList from '@/components/journals/JournalList';

export default function JournalsPage(): React.ReactElement {
  return (
    <AuthGate>
      <JournalList />
    </AuthGate>
  );
}

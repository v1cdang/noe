import AuthGate from '@/components/auth/AuthGate';
import JournalDetail from '@/components/journals/JournalDetail';

export default async function JournalByIdPage({
  params
}: Readonly<{ params: Promise<{ id: string }> }>): Promise<React.ReactElement> {
  const { id } = await params;
  return (
    <AuthGate>
      <JournalDetail journalId={id} />
    </AuthGate>
  );
}

export default function JournalListSkeleton(): React.ReactElement {
  return (
    <div className="journalSkeletonList" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="journalSkeletonCard">
          <div className="journalSkeletonLine journalSkeletonLineShort" />
          <div className="journalSkeletonLine journalSkeletonLineMid" />
          <div className="journalSkeletonLine" />
          <div className="journalSkeletonLine journalSkeletonLineTall" />
        </div>
      ))}
    </div>
  );
}

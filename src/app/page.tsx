import Link from 'next/link';

export default function HomePage(): React.ReactElement {
  return (
    <section className="page">
      <h1 className="title">Journal with a prompt. Track your mood.</h1>
      <p className="subtitle">
        Get one daily prompt, pick a mood, and optionally write a few lines. Premium
        unlocks more prompts and deeper mood trends.
      </p>
      <div className="ctaRow">
        <Link className="primaryButton" href="/auth">
          Get started
        </Link>
        <Link className="secondaryButton" href="/premium">
          See Premium
        </Link>
      </div>
    </section>
  );
}


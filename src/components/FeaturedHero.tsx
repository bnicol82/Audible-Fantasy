import Image from "next/image";
import type { Audiobook } from "@/lib/data";

export function FeaturedHero({ book }: { book: Audiobook }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-card-border glow-accent">
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/40 z-10" />
      <div className="absolute inset-0">
        <Image
          src={book.coverUrl}
          alt=""
          fill
          className="object-cover opacity-30 blur-sm scale-110"
          priority
          sizes="100vw"
        />
      </div>
      <div className="relative z-20 grid md:grid-cols-[200px_1fr] gap-8 p-8 md:p-12">
        <div className="relative aspect-[2/3] w-full max-w-[200px] mx-auto md:mx-0 rounded-lg overflow-hidden shadow-2xl">
          <Image
            src={book.coverUrl}
            alt={`${book.title} cover`}
            fill
            className="object-cover"
            priority
            sizes="200px"
          />
        </div>
        <div className="flex flex-col justify-center space-y-4">
          <span className="text-accent text-sm font-semibold uppercase tracking-widest">
            Featured Listen
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            {book.title}
          </h2>
          <p className="text-muted">
            By {book.author} · Narrated by {book.narrator}
          </p>
          <p className="text-foreground/80 max-w-xl leading-relaxed">
            {book.description}
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button className="px-6 py-3 bg-accent text-background font-semibold rounded-lg hover:bg-accent/90 transition-colors">
              Listen Now
            </button>
            <button className="px-6 py-3 border border-card-border text-foreground rounded-lg hover:border-accent/40 transition-colors">
              Add to Library
            </button>
            <span className="text-sm text-muted">
              {book.duration} · ★ {book.rating}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";
import type { Audiobook } from "@/lib/data";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-accent text-sm font-semibold">{rating}</span>
      <svg
        className="w-4 h-4 text-accent"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </div>
  );
}

export function BookCard({ book }: { book: Audiobook }) {
  return (
    <article className="book-card group bg-card border border-card-border rounded-xl overflow-hidden cursor-pointer">
      <div className="relative aspect-[2/3] overflow-hidden">
        <Image
          src={book.coverUrl}
          alt={`${book.title} cover`}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        {book.series && (
          <span className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-xs px-2 py-1 rounded-md text-accent border border-accent/30">
            Book {book.seriesNumber}
          </span>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">
          {book.title}
        </h3>
        <p className="text-sm text-muted">{book.author}</p>
        <div className="flex items-center justify-between pt-1">
          <StarRating rating={book.rating} />
          <span className="text-xs text-muted">{book.duration}</span>
        </div>
      </div>
    </article>
  );
}

"use client";

import { useMemo, useState } from "react";
import { BookCard } from "@/components/BookCard";
import { CatalogFilters } from "@/components/CatalogFilters";
import { FeaturedHero } from "@/components/FeaturedHero";
import { audiobooks } from "@/lib/data";

export default function Home() {
  const [genre, setGenre] = useState("All");
  const [search, setSearch] = useState("");

  const featured = audiobooks.find((b) => b.featured) ?? audiobooks[0];

  const filteredBooks = useMemo(() => {
    return audiobooks.filter((book) => {
      const matchesGenre = genre === "All" || book.genre === genre;
      const query = search.toLowerCase();
      const matchesSearch =
        !query ||
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.narrator.toLowerCase().includes(query) ||
        book.series?.toLowerCase().includes(query);
      return matchesGenre && matchesSearch;
    });
  }, [genre, search]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-card-border/50 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                Audible Fantasy
              </h1>
              <p className="text-xs text-muted hidden sm:block">
                Epic tales, legendary voices
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <button className="text-sm text-muted hover:text-foreground transition-colors hidden sm:block">
              My Library
            </button>
            <button className="text-sm text-muted hover:text-foreground transition-colors hidden sm:block">
              Wishlist
            </button>
            <button className="px-4 py-2 bg-accent/10 border border-accent/30 text-accent rounded-lg text-sm font-medium hover:bg-accent/20 transition-colors">
              Sign In
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <FeaturedHero book={featured} />

        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Browse the Realm
              </h2>
              <p className="text-muted mt-1">
                {filteredBooks.length} audiobook
                {filteredBooks.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>

          <CatalogFilters
            onGenreChange={setGenre}
            onSearchChange={setSearch}
          />

          {filteredBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {filteredBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 space-y-3">
              <p className="text-lg text-muted">No audiobooks found</p>
              <p className="text-sm text-muted/70">
                Try adjusting your search or genre filter
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-card-border/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-muted">
          <p>Audible Fantasy — A demo UI for browsing fantasy audiobooks</p>
        </div>
      </footer>
    </div>
  );
}

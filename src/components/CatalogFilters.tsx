"use client";

import { useState } from "react";
import { genres } from "@/lib/data";

export function GenreFilter({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (genre: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((genre) => (
        <button
          key={genre}
          onClick={() => onSelect(genre)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selected === genre
              ? "bg-accent text-background"
              : "bg-card border border-card-border text-muted hover:text-foreground hover:border-accent/40"
          }`}
        >
          {genre}
        </button>
      ))}
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full max-w-md">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="search"
        placeholder="Search titles, authors, narrators..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-3 bg-card border border-card-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-all"
      />
    </div>
  );
}

export function CatalogFilters({
  onGenreChange,
  onSearchChange,
}: {
  onGenreChange: (genre: string) => void;
  onSearchChange: (search: string) => void;
}) {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6">
      <SearchBar
        value={search}
        onChange={(value) => {
          setSearch(value);
          onSearchChange(value);
        }}
      />
      <GenreFilter
        selected={selectedGenre}
        onSelect={(genre) => {
          setSelectedGenre(genre);
          onGenreChange(genre);
        }}
      />
    </div>
  );
}

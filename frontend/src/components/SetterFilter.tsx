import { useRef, useState } from "react";
import type { Setter } from "../types";

const INITIAL_SHOW = 15;

interface Props {
  setters: Setter[];
  selected: string | null;
  onSelect: (name: string | null) => void;
}

export default function SetterFilter({ setters, selected, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? setters.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : setters;

  const visible = search || expanded ? filtered : filtered.slice(0, INITIAL_SHOW);
  const hiddenCount = filtered.length - visible.length;

  return (
    <div className="bg-th-card rounded-xl border border-th-border p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-th-text3 uppercase tracking-wider">Setter</p>
        {selected && (
          <button
            onClick={() => {
              onSelect(null);
              setSearch("");
            }}
            className="text-xs text-blue-500 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search setters…"
        className="w-full text-xs bg-th-card text-th-text1 border border-th-border rounded-lg px-2.5 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />

      <div className="space-y-0.5 max-h-64 overflow-y-auto pr-0.5">
        {visible.length === 0 ? (
          <p className="text-xs text-th-text3 py-1">No setters found</p>
        ) : (
          visible.map((s) => (
            <button
              key={s.name}
              onClick={() => onSelect(selected === s.name ? null : s.name)}
              className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs transition-colors text-left ${
                selected === s.name ? "bg-indigo-600 text-white" : "text-th-text2 hover:bg-th-hover"
              }`}
            >
              <span className="truncate">{s.name}</span>
              <span
                className={`ml-1 shrink-0 ${selected === s.name ? "text-indigo-200" : "text-th-text3"}`}
              >
                {s.count}
              </span>
            </button>
          ))
        )}
      </div>

      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-1.5 text-xs text-blue-500 hover:underline"
        >
          Show {hiddenCount} more…
        </button>
      )}
      {expanded && filtered.length > INITIAL_SHOW && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-1.5 text-xs text-blue-500 hover:underline"
        >
          Show less
        </button>
      )}
    </div>
  );
}

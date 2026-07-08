import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";

interface FlatTreeNode {
  readonly irdi: string;
  readonly code: string;
  readonly label: string;
  readonly parentIrdi: string | null;
  readonly depth: number;
  readonly declaredPropertyCount: number;
}

interface Props {
  dict: string;
  initialHighlightedIrdi?: string;
}

const STORAGE_PREFIX = "opencdd-tree:";

function detectHighlightedCode(initial?: string): string | null {
  if (typeof window === "undefined") return null;
  if (initial) {
    const m = initial.match(/\/c\/([^/]+)\/?$/);
    if (m && m[1]) return m[1];
  }
  return null;
}

function loadExpanded(dict: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + dict);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveExpanded(dict: string, expanded: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_PREFIX + dict,
      JSON.stringify([...expanded]),
    );
  } catch {
    // sessionStorage can be unavailable (private mode) — non-fatal.
  }
}

function ancestorsOf(node: FlatTreeNode, lookup: Map<string, FlatTreeNode>): string[] {
  const out: string[] = [];
  let current: FlatTreeNode | undefined = node;
  while (current?.parentIrdi) {
    out.push(current.parentIrdi);
    current = lookup.get(current.parentIrdi);
  }
  return out;
}

export default function ClassTree({ dict, initialHighlightedIrdi }: Props) {
  const [nodes, setNodes] = useState<FlatTreeNode[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    fetch(`${import.meta.env.BASE_URL}d/${dict}/tree.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<FlatTreeNode[]>;
      })
      .then((data) => {
        if (!cancelled) setNodes(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [dict]);

  const nodeByIrdi = useMemo(() => {
    const m = new Map<string, FlatTreeNode>();
    for (const n of nodes) m.set(n.irdi, n);
    return m;
  }, [nodes]);

  const [expanded, setExpanded] = useState<Set<string>>(() => loadExpanded(dict));
  const [query, setQuery] = useState("");
  const highlightedCode = detectHighlightedCode(initialHighlightedIrdi);
  const highlightedIrdi = highlightedCode
    ? (() => {
        for (const n of nodes) {
          if (n.code === highlightedCode) return n.irdi;
        }
        return null;
      })()
    : null;

  // Auto-expand ancestors of the highlighted node.
  useEffect(() => {
    if (!highlightedIrdi) return;
    const node = nodeByIrdi.get(highlightedIrdi);
    if (!node) return;
    const ancestors = ancestorsOf(node, nodeByIrdi);
    if (ancestors.length === 0) return;
    setExpanded((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const a of ancestors) {
        if (!next.has(a)) {
          next.add(a);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [highlightedIrdi, nodeByIrdi]);

  useEffect(() => {
    saveExpanded(dict, expanded);
  }, [dict, expanded]);

  // ?expand=<code> back-link.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const expandCode = params.get("expand");
    if (!expandCode) return;
    let target: FlatTreeNode | undefined;
    for (const n of nodes) {
      if (n.code === expandCode) {
        target = n;
        break;
      }
    }
    if (!target) return;
    const ancestors = ancestorsOf(target, nodeByIrdi);
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const a of ancestors) next.add(a);
      return next;
    });
  }, [nodes, nodeByIrdi]);

  const isExpanded = useCallback((irdi: string) => expanded.has(irdi), [expanded]);

  const setNodeExpanded = useCallback((irdi: string, open: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(irdi);
      else next.delete(irdi);
      return next;
    });
  }, []);

  const visible = useMemo(() => {
    if (query.trim().length === 0) {
      const out: FlatTreeNode[] = [];
      const walk = (n: FlatTreeNode) => {
        out.push(n);
        const children = nodes.filter((c) => c.parentIrdi === n.irdi);
        if (isExpanded(n.irdi)) for (const c of children) walk(c);
      };
      for (const root of nodes.filter((n) => n.parentIrdi === null)) walk(root);
      return out;
    }

    const needle = query.trim().toLowerCase();
    const matched = nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(needle) ||
        n.code.toLowerCase().includes(needle) ||
        n.irdi.toLowerCase().includes(needle),
    );
    const keep = new Set<string>(matched.map((m) => m.irdi));
    for (const m of matched) {
      for (const a of ancestorsOf(m, nodeByIrdi)) keep.add(a);
    }
    return nodes.filter((n) => keep.has(n.irdi));
  }, [nodes, query, isExpanded, nodeByIrdi]);

  const [focusIdx, setFocusIdx] = useState(0);
  const focusRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (focusRef.current) {
      focusRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [focusIdx]);

  const onKeyDown = useCallback(
    (e: globalThis.KeyboardEvent) => {
      if (visible.length === 0) return;
      const node = visible[focusIdx];
      if (!node) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusIdx((i) => Math.min(visible.length - 1, i + 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusIdx((i) => Math.max(0, i - 1));
          break;
        case "Home":
          e.preventDefault();
          setFocusIdx(0);
          break;
        case "End":
          e.preventDefault();
          setFocusIdx(visible.length - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (!isExpanded(node.irdi)) setNodeExpanded(node.irdi, true);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (isExpanded(node.irdi)) setNodeExpanded(node.irdi, false);
          break;
        case "Enter": {
          e.preventDefault();
          const link = focusRef.current?.parentElement?.querySelector<HTMLAnchorElement>(
            `a[data-irdi="${node.irdi}"]`,
          );
          link?.click();
          break;
        }
      }
    },
    [visible, focusIdx, isExpanded, setNodeExpanded],
  );

  const expandAll = useCallback(() => {
    setExpanded(new Set(nodes.map((n) => n.irdi)));
  }, [nodes]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  // `/` focuses the filter.
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loadError) {
    return (
      <p class="px-2 py-4 text-xs text-rose-700">
        Could not load class tree: {loadError}
      </p>
    );
  }

  if (nodes.length === 0) {
    return (
      <div class="space-y-2" aria-busy="true">
        <div class="h-8 rounded bg-sand-200/60 animate-pulse" />
        <div class="h-8 rounded bg-sand-200/60 animate-pulse w-5/6" />
        <div class="h-8 rounded bg-sand-200/60 animate-pulse w-4/6" />
        <div class="h-8 rounded bg-sand-200/60 animate-pulse" />
        <p class="text-xs text-ink-500">Loading class tree…</p>
      </div>
    );
  }

  return (
    <div class="flex h-full flex-col">
      <div class="mb-2 flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          placeholder="Filter tree…"
          aria-label="Filter class tree"
          class="w-full rounded-md border border-ink-200 bg-sand-50 px-2.5 py-1.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-accent-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-200"
        />
        <button
          type="button"
          onClick={expandAll}
          title="Expand all"
          class="rounded-md px-1.5 py-1 text-ink-400 transition hover:bg-sand-100 hover:text-ink-700"
          aria-label="Expand all"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" class="h-3.5 w-3.5" aria-hidden>
            <path d="M5 3.25C5 2.56 5.56 2 6.25 2h6.5C13.44 2 14 2.56 14 3.25v6.5c0 .69-.56 1.25-1.25 1.25h-6.5C5.56 11 5 10.44 5 9.75v-6.5Zm-3 3A1.25 1.25 0 0 1 3.25 5h.5a.75.75 0 0 1 0 1.5H3.5v.75a.75.75 0 0 1-1.5 0v-1Z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={collapseAll}
          title="Collapse all"
          class="rounded-md px-1.5 py-1 text-ink-400 transition hover:bg-sand-100 hover:text-ink-700"
          aria-label="Collapse all"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" class="h-3.5 w-3.5" aria-hidden>
            <path d="M6.25 3a1.25 1.25 0 0 0-1.25 1.25v.5a.75.75 0 0 0 1.5 0v-.25h3.5v3.5h-.25a.75.75 0 0 0 0 1.5h.5A1.25 1.25 0 0 0 12 8.25v-4A1.25 1.25 0 0 0 10.75 3h-4.5Z" />
          </svg>
        </button>
      </div>

      <div class="relative flex-1">
        {visible.length === 0 ? (
          <p class="px-2 py-4 text-xs text-ink-500">No matching classes.</p>
        ) : (
          <ul
            role="tree"
            aria-label={`${dict} classes`}
            onKeyDown={onKeyDown}
            class="text-sm"
          >
            {visible.map((node, i) => {
              const hasChildren = nodes.some((c) => c.parentIrdi === node.irdi);
              const open = isExpanded(node.irdi);
              const isActive = highlightedIrdi === node.irdi;
              const href = `/d/${dict}/c/${node.code}`;
              return (
                <li
                  role="treeitem"
                  aria-expanded={hasChildren ? open : undefined}
                  aria-level={node.depth + 1}
                  aria-selected={isActive}
                  data-irdi={node.irdi}
                  style={`padding-left: ${node.depth * 0.75 + 0.25}rem`}
                  class={`flex items-center gap-1 rounded-md py-0.5 pl-1 pr-1 ${
                    isActive ? "bg-accent-50 text-accent-900" : "hover:bg-sand-100"
                  } ${i === focusIdx ? "ring-2 ring-accent-300 ring-inset" : ""}`}
                  key={node.irdi}
                >
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNodeExpanded(node.irdi, !open);
                      }}
                      aria-label={open ? "Collapse" : "Expand"}
                      class="grid h-4 w-4 shrink-0 place-items-center rounded text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                    >
                      <svg
                        viewBox="0 0 12 12"
                        fill="currentColor"
                        class={`h-2.5 w-2.5 transition ${open ? "rotate-90" : ""}`}
                        aria-hidden
                      >
                        <path d="M4.5 2.5 8 6 4.5 9.5z" />
                      </svg>
                    </button>
                  ) : (
                    <span class="inline-block h-4 w-4 shrink-0" aria-hidden />
                  )}
                  <a
                    ref={i === focusIdx ? focusRef : undefined}
                    href={href}
                    data-irdi={node.irdi}
                    title={node.label}
                    class={`flex flex-1 items-baseline gap-1.5 truncate py-0.5 pr-1 text-[13px] leading-snug ${
                      isActive
                        ? "font-medium text-accent-900"
                        : "text-ink-800"
                    }`}
                  >
                    <span class="truncate">{node.label}</span>
                    {node.declaredPropertyCount > 0 && (
                      <span class="ml-auto shrink-0 rounded-full bg-sand-200/60 px-1.5 font-mono text-[10px] text-ink-500">
                        {node.declaredPropertyCount}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

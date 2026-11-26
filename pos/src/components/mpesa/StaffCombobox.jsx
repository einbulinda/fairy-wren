import { useEffect, useId, useMemo, useState } from "react";
import { User, X } from "lucide-react";
import { MpesaService } from "@/services/mpesa.service";

// Staff list rarely changes during a shift: fetch once per app session.
let staffCache = null;
let staffRequest = null;

const loadStaff = () => {
  if (staffCache) return Promise.resolve(staffCache);
  if (!staffRequest) {
    staffRequest = MpesaService.staff()
      .then((list) => {
        staffCache = Array.isArray(list) ? list : [];
        return staffCache;
      })
      .finally(() => {
        staffRequest = null;
      });
  }
  return staffRequest;
};

const ROLE_LABELS = {
  waitress: "Waiter",
  bartender: "Bartender",
  supervisor: "Supervisor",
  manager: "Manager",
  owner: "Owner",
  stock_control: "Stock",
};

/**
 * Type-to-search dropdown of staff. Used to say who an M-Pesa tip is for.
 * The option list renders in the page flow (not floating) so scrolling modal
 * bodies can't clip it.
 *
 * @param {{ value: {id:string,name:string}|null, onChange: (staff|null) => void,
 *           placeholder?: string, disabled?: boolean, autoFocus?: boolean }} props
 */
const StaffCombobox = ({ value, onChange, placeholder = "Type a name…", disabled, autoFocus }) => {
  const [staff, setStaff] = useState(staffCache || []);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  useEffect(() => {
    let alive = true;
    loadStaff()
      .then((list) => alive && setStaff(list))
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? staff.filter((s) => s.name?.toLowerCase().includes(q)) : staff;
    return list.slice(0, 50);
  }, [staff, query]);

  const choose = (s) => {
    onChange(s ? { id: s.id, name: s.name } : null);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && matches[active]) {
        e.preventDefault();
        choose(matches[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Selected: show a chip with a clear button
  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/40 text-sm">
        <User size={16} className="text-yellow-300 shrink-0" />
        <span className="flex-1 text-white truncate">Tip for {value.name}</span>
        <button
          type="button"
          onClick={() => choose(null)}
          disabled={disabled}
          className="p-1 rounded hover:bg-yellow-400/20 text-yellow-300 disabled:opacity-50"
          aria-label="Change staff member"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Who is the tip for?"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-yellow-400/40 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-400 disabled:opacity-50"
      />
      {loadError && <p className="text-xs text-red-400">Couldn't load staff list.</p>}
      {open && !loadError && (
        <ul
          id={listId}
          role="listbox"
          className="max-h-44 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 divide-y divide-gray-800"
        >
          {matches.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">
              {staff.length ? "No staff with that name" : "Loading…"}
            </li>
          )}
          {matches.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()} // keep focus so the click lands
              onClick={() => choose(s)}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-2 text-sm cursor-pointer flex justify-between gap-2 ${
                i === active ? "bg-yellow-400/15 text-white" : "text-gray-300"
              }`}
            >
              <span className="truncate">{s.name}</span>
              <span className="text-xs text-gray-500 shrink-0">{ROLE_LABELS[s.role] || s.role}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StaffCombobox;

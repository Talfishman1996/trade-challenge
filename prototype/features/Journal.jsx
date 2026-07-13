import { FileSearch, Filter, MoreHorizontal, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePrototypeStore } from '../adapters/PrototypeStore.jsx';
import { searchRecords } from '../domain/ledger.js';
import { money } from '../model/riskModel.js';
import { Button, Card, EmptyState, IconButton, SectionHeading, StatusPill, useDialogFocus } from '../ui/primitives.jsx';

const PAGE_SIZE = 30;
const EMPTY_QUERY = { text: '', outcome: 'all', direction: 'all', strategy: 'all', syncState: 'all', reviewed: 'all', dateFrom: '', dateTo: '', sort: 'newest' };

function initialQuery() {
  const params = new URLSearchParams(window.location.search);
  return { ...EMPTY_QUERY, text: params.get('q') || '', outcome: params.get('outcome') || 'all', direction: params.get('direction') || 'all', strategy: params.get('strategy') || 'all', syncState: params.get('sync') || 'all', reviewed: params.get('reviewed') || 'all', dateFrom: params.get('from') || '', dateTo: params.get('to') || '', sort: params.get('sort') || 'newest' };
}

function RecordCard({ record, onOpen, onDelete }) {
  return (
    <article className="record-card">
      <button className="record-card__open" onClick={() => onOpen(record.uid)} aria-label={`Open trade ${record.displayId}, ${record.instrument}, ${money(record.netPnl, { sign: true })}`}>
        <span className={`outcome-mark outcome-mark--${record.outcome}`}>{record.outcome === 'break-even' ? 'BE' : record.outcome.slice(0, 1).toUpperCase()}</span>
        <span className="record-card__identity"><strong>{record.instrument}</strong><small>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(record.closedAt))} · {record.direction || 'Not recorded'}</small></span>
        <span className="record-card__result"><strong className={record.netPnl < 0 ? 'money-loss' : record.netPnl > 0 ? 'money-win' : ''}>{money(record.netPnl, { sign: true })}</strong><StatusPill state={record.syncState}>{record.syncState === 'verified' ? 'Uploaded' : record.syncState}</StatusPill></span>
      </button>
      <IconButton label={`Delete trade ${record.displayId}`} className="record-card__delete" onClick={() => onDelete(record.uid)}><Trash2 aria-hidden="true" /></IconButton>
    </article>
  );
}

export default function Journal({ onCapture, onOpenRecord }) {
  const { state, actions } = usePrototypeStore();
  const [query, setQuery] = useState(initialQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [deleteUid, setDeleteUid] = useState(null);
  const cancelDeleteRef = useRef(null);
  const deleteDialogRef = useDialogFocus({ active: Boolean(deleteUid), initialFocusRef: cancelDeleteRef, onEscape: () => setDeleteUid(null) });
  const results = useMemo(() => searchRecords(state.records, query), [state.records, query]);
  const strategies = useMemo(() => [...new Set(state.records.filter((record) => !record.deleted && record.strategy).map((record) => record.strategy))].sort(), [state.records]);
  const deleteRecord = state.records.find((record) => record.uid === deleteUid);

  useEffect(() => {
    const url = new URL(window.location.href);
    const mapping = { q: query.text, outcome: query.outcome === 'all' ? '' : query.outcome, direction: query.direction === 'all' ? '' : query.direction, strategy: query.strategy === 'all' ? '' : query.strategy, sync: query.syncState === 'all' ? '' : query.syncState, reviewed: query.reviewed === 'all' ? '' : query.reviewed, from: query.dateFrom, to: query.dateTo, sort: query.sort === 'newest' ? '' : query.sort };
    for (const [key, value] of Object.entries(mapping)) value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
    window.history.replaceState({}, '', url);
    setVisibleCount(PAGE_SIZE);
  }, [query]);

  function confirmDelete() {
    if (!deleteRecord) return;
    actions.deleteTrade(deleteRecord.uid);
    setDeleteUid(null);
  }

  const activeFilterCount = Number(query.outcome !== 'all') + Number(query.direction !== 'all') + Number(query.strategy !== 'all') + Number(query.syncState !== 'all') + Number(query.reviewed !== 'all') + Number(Boolean(query.dateFrom)) + Number(Boolean(query.dateTo)) + Number(query.sort !== 'newest');
  return (
    <main className="page" id="main-content">
      <SectionHeading eyebrow="Record authority" title="Journal" action={<Button onClick={onCapture}>Log trade</Button>} />
      <div className="journal-tools">
        <label className="search-field" htmlFor="journal-search"><Search aria-hidden="true" /><input id="journal-search" type="search" placeholder="Search instrument, note, strategy, ID" value={query.text} onChange={(event) => setQuery((current) => ({ ...current, text: event.target.value }))} /><span className="sr-only">Search journal</span>{query.text && <IconButton label="Clear search" onClick={() => setQuery((current) => ({ ...current, text: '' }))}><X aria-hidden="true" /></IconButton>}</label>
        <Button variant="secondary" aria-expanded={showFilters} onClick={() => setShowFilters((value) => !value)}><Filter aria-hidden="true" /> Filters {activeFilterCount > 0 && <span className="count-badge">{activeFilterCount}</span>}</Button>
      </div>
      {showFilters && <Card className="filter-panel">
        <label>Outcome<select value={query.outcome} onChange={(event) => setQuery((current) => ({ ...current, outcome: event.target.value }))}><option value="all">All outcomes</option><option value="win">Wins</option><option value="loss">Losses</option><option value="break-even">Break-even</option></select></label>
        <label>Direction<select value={query.direction} onChange={(event) => setQuery((current) => ({ ...current, direction: event.target.value }))}><option value="all">All directions</option><option value="long">Long</option><option value="short">Short</option><option value="not-recorded">Not recorded</option></select></label>
        <label>Strategy<select value={query.strategy} onChange={(event) => setQuery((current) => ({ ...current, strategy: event.target.value }))}><option value="all">All strategies</option>{strategies.map((strategy) => <option value={strategy} key={strategy}>{strategy}</option>)}</select></label>
        <label>Durability<select value={query.syncState} onChange={(event) => setQuery((current) => ({ ...current, syncState: event.target.value }))}><option value="all">All states</option><option value="verified">Uploaded</option><option value="queued">Waiting</option><option value="failed">Failed</option><option value="conflict">Conflict</option></select></label>
        <label>Review state<select value={query.reviewed} onChange={(event) => setQuery((current) => ({ ...current, reviewed: event.target.value }))}><option value="all">All records</option><option value="reviewed">Reviewed</option><option value="unreviewed">Unreviewed</option></select></label>
        <label>From<input type="date" value={query.dateFrom} onChange={(event) => setQuery((current) => ({ ...current, dateFrom: event.target.value }))} /></label>
        <label>Through<input type="date" value={query.dateTo} onChange={(event) => setQuery((current) => ({ ...current, dateTo: event.target.value }))} /></label>
        <label>Sort<select value={query.sort} onChange={(event) => setQuery((current) => ({ ...current, sort: event.target.value }))}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="largest-win">Largest win</option><option value="largest-loss">Largest loss</option></select></label>
      </Card>}
      <div className="journal-count" aria-live="polite"><strong>{results.length.toLocaleString()}</strong> {results.length === 1 ? 'record' : 'records'}<span>Showing {Math.min(visibleCount, results.length).toLocaleString()}</span></div>
      {results.length ? <div className="record-list">{results.slice(0, visibleCount).map((record) => <RecordCard key={record.uid} record={record} onOpen={onOpenRecord} onDelete={setDeleteUid} />)}{visibleCount < results.length && <Button variant="secondary" className="load-more" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Load 30 more</Button>}</div> : <EmptyState icon={<FileSearch aria-hidden="true" />} title={state.records.length ? 'No matching records' : 'Your ledger begins here'} detail={state.records.length ? 'Keep the search context and adjust one filter.' : 'Log a result to create the first device receipt.'} action={<Button onClick={state.records.length ? () => setQuery(EMPTY_QUERY) : onCapture}>{state.records.length ? 'Clear filters' : 'Log first trade'}</Button>} />}

      {deleteRecord && <div className="dialog-layer" role="presentation"><section ref={deleteDialogRef} className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description"><MoreHorizontal aria-hidden="true" /><h2 id="delete-title">Delete trade {deleteRecord.displayId}?</h2><p id="delete-description">This creates a record-specific tombstone. You can undo this exact deletion for 8 seconds.</p><div className="dialog__actions"><Button ref={cancelDeleteRef} variant="quiet" onClick={() => setDeleteUid(null)}>Cancel</Button><Button variant="danger" onClick={confirmDelete}>Delete trade</Button></div></section></div>}
    </main>
  );
}

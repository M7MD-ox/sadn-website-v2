'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, MessageSquareMore, Plus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ChatThreadCard } from '@/components/sadn/ChatThreadCard';
import type { ChatMsg, ChatThread } from '@/lib/store-settings';
import { AddRowButton, RowDeleteButton, SettingsCard } from '../kit';
import { SortableList } from '../SortableList';
import { inputCls, type SettingsCardProps } from './shared';

/** Round 17: WhatsApp review chats — one card per customer, live preview. */
export function ChatThreadsCard({ s, setS, baseline, t, save, saveBtn }: SettingsCardProps) {
  // Which chat thread's live WhatsApp preview is expanded (round 17)
  const [previewThread, setPreviewThread] = useState<string>('');

  return (
    <SettingsCard icon={MessageSquareMore} title={t('chatsTitle')} description={t('chatsBody')}>
      <div className="mt-4">
        <SortableList
          items={s.chatThreads}
          getId={(th) => th.id}
          ariaLabel={t('chatsTitle')}
          t={t}
          onReorder={(next) => setS((p) => ({ ...p, chatThreads: next }))}
          className="space-y-3"
          renderItem={(thread, i) => {
            const setThread = (patch: Partial<ChatThread>) =>
              setS((p) => ({
                ...p,
                chatThreads: p.chatThreads.map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
              }));
            const setMsg = (mi: number, patch: Partial<ChatMsg>) =>
              setThread({
                messages: thread.messages.map((m, x) => (x === mi ? { ...m, ...patch } : m)),
              });
            const moveMsg = (mi: number, dir: -1 | 1) => {
              const j = mi + dir;
              if (j < 0 || j >= thread.messages.length) return;
              const msgs = [...thread.messages];
              [msgs[mi], msgs[j]] = [msgs[j], msgs[mi]];
              setThread({ messages: msgs });
            };
            const delMsg = (mi: number) =>
              setThread({ messages: thread.messages.filter((_, x) => x !== mi) });
            const addMsg = () =>
              setThread({
                messages: [
                  ...thread.messages,
                  { id: `m-${Date.now().toString(36)}`, from: 'customer' as const, text: '', time: '' },
                ],
              });
            return (
              <div className="rounded-none border border-sadn-plum-100 p-3">
                {/* Customer identity row */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={thread.customerName}
                    onChange={(e) => setThread({ customerName: e.target.value })}
                    placeholder={t('chatNamePlaceholder')}
                    aria-label={t('chatName')}
                    dir="rtl"
                    className={`${inputCls} h-10 min-w-[140px] flex-1`}
                  />
                  <input
                    value={thread.dateLabel}
                    onChange={(e) => setThread({ dateLabel: e.target.value })}
                    placeholder="أمس"
                    aria-label={t('chatDateLabel')}
                    dir="rtl"
                    className={`${inputCls} h-10 w-24 text-center text-xs`}
                  />
                  <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[10px] text-sadn-ink-soft">
                    <Switch
                      checked={thread.enabled}
                      onCheckedChange={(v) => setThread({ enabled: v })}
                      aria-label={t('sectionEnabled')}
                    />
                    {t('sectionEnabled')}
                  </label>
                  <RowDeleteButton
                    label={t('delete')}
                    onClick={() =>
                      setS((p) => ({
                        ...p,
                        chatThreads: p.chatThreads.filter((_, idx) => idx !== i),
                      }))
                    }
                    className="shrink-0"
                  />
                </div>

                {/* Messages */}
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-sadn-ink-soft">
                  {t('chatMessages')} · {thread.messages.length}
                </p>
                <div className="mt-2 space-y-2">
                  {thread.messages.map((m, mi) => (
                    <div
                      key={m.id}
                      className="rounded-none border border-sadn-plum-50 bg-sadn-plum-50/40 p-2"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Sender toggle — customer bubbles right, store left */}
                        <div
                          role="group"
                          aria-label={t('chatsTitle')}
                          className="flex shrink-0 overflow-hidden rounded-none border border-sadn-plum-200"
                        >
                          <button
                            type="button"
                            aria-pressed={m.from === 'customer'}
                            onClick={() => setMsg(mi, { from: 'customer' })}
                            className={`h-9 px-2.5 text-[10px] font-semibold transition-colors ${
                              m.from === 'customer'
                                ? 'bg-sadn-plum-800 text-white'
                                : 'bg-white text-sadn-ink-soft hover:bg-sadn-plum-50'
                            }`}
                          >
                            {t('chatFromCustomer')}
                          </button>
                          <button
                            type="button"
                            aria-pressed={m.from === 'store'}
                            onClick={() => setMsg(mi, { from: 'store' })}
                            className={`h-9 px-2.5 text-[10px] font-semibold transition-colors ${
                              m.from === 'store'
                                ? 'bg-sadn-plum-800 text-white'
                                : 'bg-white text-sadn-ink-soft hover:bg-sadn-plum-50'
                            }`}
                          >
                            {t('chatFromStore')}
                          </button>
                        </div>
                        <input
                          value={m.text}
                          onChange={(e) => setMsg(mi, { text: e.target.value })}
                          placeholder={t('chatMessagePlaceholder')}
                          dir="rtl"
                          className={`${inputCls} h-9 min-w-[160px] flex-1 text-xs`}
                        />
                        <input
                          value={m.time}
                          onChange={(e) => setMsg(mi, { time: e.target.value })}
                          placeholder={t('chatTimePlaceholder')}
                          dir="ltr"
                          className={`${inputCls} h-9 w-20 text-center text-xs`}
                        />
                        <input
                          value={m.reaction ?? ''}
                          onChange={(e) => setMsg(mi, { reaction: e.target.value || undefined })}
                          placeholder="❤️"
                          aria-label={t('chatReaction')}
                          className={`${inputCls} h-9 w-12 text-center text-sm`}
                        />
                        <span className="flex shrink-0 items-center">
                          <button
                            type="button"
                            onClick={() => moveMsg(mi, -1)}
                            disabled={mi === 0}
                            aria-label={t('chatMoveUp')}
                            className="tap-target flex h-8 w-8 items-center justify-center rounded-none text-sadn-ink-soft transition-colors hover:bg-sadn-plum-50 hover:text-sadn-ink disabled:opacity-30"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMsg(mi, 1)}
                            disabled={mi === thread.messages.length - 1}
                            aria-label={t('chatMoveDown')}
                            className="tap-target flex h-8 w-8 items-center justify-center rounded-none text-sadn-ink-soft transition-colors hover:bg-sadn-plum-50 hover:text-sadn-ink disabled:opacity-30"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <RowDeleteButton label={t('delete')} onClick={() => delMsg(mi)} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addMsg}
                  disabled={thread.messages.length >= 40}
                  className="press mt-2 inline-flex h-9 items-center gap-1.5 rounded-none border border-sadn-plum-200 px-3 text-[11px] font-semibold text-sadn-plum-800 transition-colors hover:bg-sadn-plum-50 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                  {t('addMessage')}
                </button>

                {/* Live WhatsApp preview — exactly what the storefront renders */}
                <button
                  type="button"
                  onClick={() =>
                    setPreviewThread((cur) => (cur === thread.id ? '' : thread.id))
                  }
                  aria-expanded={previewThread === thread.id}
                  className="press mt-3 inline-flex h-9 items-center gap-1.5 rounded-none border border-sadn-plum-200 px-3 text-[11px] font-semibold text-sadn-plum-800 transition-colors hover:bg-sadn-plum-50"
                >
                  <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {t('chatPreview')}
                </button>
                {previewThread === thread.id && (
                  <div className="mt-3">
                    <ChatThreadCard thread={thread} />
                  </div>
                )}
              </div>
            );
          }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <AddRowButton
          label={t('addChat')}
          disabled={s.chatThreads.length >= 12}
          onClick={() =>
            setS((p) => ({
              ...p,
              chatThreads: [
                ...p.chatThreads,
                {
                  id: `chat-${Date.now().toString(36)}`,
                  customerName: '',
                  dateLabel: 'أمس',
                  enabled: true,
                  messages: [],
                },
              ],
            }))
          }
        />
        {saveBtn(
          JSON.stringify(s.chatThreads) === JSON.stringify(baseline.chatThreads),
          () => void save(['chatThreads'], 'savedToast', 'chats'),
          'chats'
        )}
      </div>
    </SettingsCard>
  );
}

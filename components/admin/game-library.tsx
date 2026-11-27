import Link from "next/link";
import { Gamepad2, Globe2, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteGameAction, saveGameAction } from "@/app/(admin)/admin/actions";
import { ActionForm } from "@/components/action-form";
import {
  btnSecondary,
  Card,
  EmptyState,
  Field,
  inputCls,
  selectCls,
  textareaCls,
} from "@/components/admin/ui";
import { ImageField } from "@/components/image-field";
import type { listGamesAdmin } from "@/lib/services/admin-catalog";

type Games = Awaited<ReturnType<typeof listGamesAdmin>>;
type Game = Games[number];

export function GameLibrary({ games, editingId }: { games: Games; editingId?: number }) {
  const editing = editingId ? games.find((game) => game.id === editingId) : null;
  const topLevelGames = games.filter((game) => game.parentId === null);
  const parentOptions = topLevelGames.filter((game) => game.id !== editing?.id);
  const childrenByParent = new Map<number, Game[]>();
  for (const game of games) {
    if (game.parentId === null) continue;
    const children = childrenByParent.get(game.parentId) ?? [];
    children.push(game);
    childrenByParent.set(game.parentId, children);
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.75fr)]">
      <Card
        padded={false}
        title="Game library"
        icon={Gamepad2}
        actions={editing ? (
          <Link href="/admin/categories?tab=popular&view=library" className={btnSecondary}>
            <Plus className="h-4 w-4" /> New game
          </Link>
        ) : undefined}
      >
        {topLevelGames.length === 0 ? (
          <EmptyState icon={Gamepad2} title="No games" description="Create the first game card." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {topLevelGames.map((game) => {
              const regions = childrenByParent.get(game.id) ?? [];
              const familyProducts = game.productCount + regions.reduce((total, region) => total + region.productCount, 0);
              return (
                <li key={game.id} className={editing?.id === game.id ? "bg-orange-50/50 p-4" : "p-4"}>
                  <div className="flex items-start gap-3">
                    <GameImage game={game} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-extrabold text-gray-950">{game.name}</p>
                        <Status active={game.isActive} />
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">Popular card</span>
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-gray-400">/{game.slug}</p>
                      <p className="mt-1 text-[11px] font-semibold text-gray-500">{regions.length} region{regions.length === 1 ? "" : "s"} · {familyProducts} product{familyProducts === 1 ? "" : "s"}</p>
                    </div>
                    <GameActions game={game} />
                  </div>

                  {regions.length > 0 && (
                    <div className="ml-0 mt-3 grid gap-2 border-l-2 border-orange-100 pl-3 sm:ml-14">
                      {regions.map((region) => (
                        <div key={region.id} className={editing?.id === region.id ? "flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3" : "flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3"}>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-400 shadow-sm"><Globe2 className="h-4 w-4" /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-xs font-extrabold text-gray-800">{region.region || region.name}</p>
                              <Status active={region.isActive} small />
                            </div>
                            <p className="truncate text-[10px] text-gray-400">{region.name} · {region.productCount} products</p>
                          </div>
                          <GameActions game={region} compact />
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title={editing ? "Edit game" : "New game"} icon={editing ? Pencil : Plus}>
        <ActionForm action={saveGameAction} submitLabel={editing ? "Save game" : "Create game"} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <Field label="Name">
            <input name="name" defaultValue={editing?.name ?? ""} required className={inputCls} />
          </Field>
          <Field label="Slug" hint="Leave blank to generate it.">
            <input name="slug" defaultValue={editing?.slug ?? ""} className={inputCls} />
          </Field>
          <Field label="Type">
            <select name="parentId" defaultValue={editing?.parentId ?? ""} className={selectCls}>
              <option value="">Popular game card</option>
              {parentOptions.map((game) => <option key={game.id} value={game.id}>Regional variant of {game.name}</option>)}
            </select>
          </Field>
          <Field label="Region" hint="Required only for a regional variant.">
            <input name="region" defaultValue={editing?.region ?? ""} placeholder="e.g. Global, Korea" className={inputCls} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <ImageField label="Game image" name="image" defaultValue={editing?.image ?? ""} />
            <ImageField label="Small icon" name="icon" defaultValue={editing?.icon ?? ""} />
          </div>

          <details className="group rounded-xl border border-gray-200 bg-gray-50/60">
            <summary className="cursor-pointer list-none px-3.5 py-3 text-xs font-extrabold text-gray-700 marker:hidden">Optional content</summary>
            <div className="space-y-4 border-t border-gray-100 p-3.5">
              <Field label="Description">
                <textarea name="description" defaultValue={editing?.description ?? ""} rows={2} className={textareaCls} />
              </Field>
              <Field label="Top-up instructions">
                <textarea name="instructions" defaultValue={editing?.instructions ?? ""} rows={3} className={textareaCls} />
              </Field>
            </div>
          </details>

          <div className="grid grid-cols-2 items-end gap-3">
            <Field label="Display order">
              <input name="sortOrder" type="number" defaultValue={String(editing?.sortOrder ?? 0)} className={inputCls} />
            </Field>
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-700">
              <input type="checkbox" name="isActive" defaultChecked={editing ? editing.isActive : true} className="h-4 w-4 accent-orange-500" /> Active
            </label>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}

function GameImage({ game }: { game: Game }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 ring-1 ring-black/5">
      {game.image ? <img src={game.image} alt="" className="h-full w-full object-cover" /> : <Gamepad2 className="h-4 w-4 text-gray-400" />}
    </div>
  );
}

function Status({ active, small = false }: { active: boolean; small?: boolean }) {
  return (
    <span className={`${small ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"} rounded-full font-bold ${active ? "bg-emerald-50 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
      {active ? "Active" : "Disabled"}
    </span>
  );
}

function GameActions({ game, compact = false }: { game: Game; compact?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Link
        href={`/admin/categories?tab=popular&view=library&editGame=${game.id}`}
        aria-label={`Edit ${game.name}`}
        className={`${compact ? "h-8 w-8" : "h-9 w-9"} flex items-center justify-center rounded-lg text-gray-400 transition hover:bg-white hover:text-accent-orange`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Link>
      <ActionForm action={deleteGameAction} submitLabel="Delete" confirm={`Delete ${game.name}?`} hideButton>
        <input type="hidden" name="id" value={game.id} />
        <button type="submit" aria-label={`Delete ${game.name}`} className={`${compact ? "h-8 w-8" : "h-9 w-9"} flex items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600`}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </ActionForm>
    </div>
  );
}

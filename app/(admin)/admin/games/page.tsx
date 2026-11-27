import Link from "next/link";
import { redirect } from "next/navigation";
import { Gamepad2, Pencil, Plus, Trash2 } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { ImageField } from "@/components/image-field";
import {
  btnSecondary,
  Card,
  EmptyState,
  Field,
  inputCls,
  PageHeader,
  selectCls,
  textareaCls,
  tdCls,
  thCls,
} from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { listGamesAdmin } from "@/lib/services/admin-catalog";
import { deleteGameAction, saveGameAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminGamesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "categories.manage")) return <NoAccess />;

  const [{ edit }, games] = await Promise.all([searchParams, listGamesAdmin()]);
  const editing = edit ? games.find((game) => game.id === Number(edit)) : null;
  const gameNames = new Map(games.map((game) => [game.id, game.name]));
  const topLevelGames = games.filter((game) => game.parentId === null && game.id !== editing?.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalogue structure"
        title="Games"
        description="Organise the games shown on the storefront."
        actions={
          editing ? (
            <Link href="/admin/games" className={btnSecondary}>
              <Plus className="h-4 w-4" /> New game
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card padded={false} title="All games" icon={Gamepad2}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="border-b border-gray-100 bg-gray-50/70">
                <tr>
                  <th className={thCls}>Game</th>
                  <th className={thCls}>Products</th>
                  <th className={thCls}>Order</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {games.map((game) => (
                  <tr
                    key={game.id}
                    className={`transition hover:bg-orange-50/40 ${editing?.id === game.id ? "bg-orange-50/60" : ""}`}
                  >
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 ring-1 ring-black/5">
                          {game.image ? (
                            <img src={game.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Gamepad2 className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">{game.name}</p>
                          <p className="truncate font-mono text-[11px] text-gray-400">{game.slug}</p>
                          {game.parentId !== null && (
                            <p className="truncate text-[11px] text-gray-500">
                              Region: {game.region} · {gameNames.get(game.parentId) ?? "Unknown parent"}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`${tdCls} font-semibold text-gray-700`}>{game.productCount}</td>
                    <td className={tdCls}>{game.sortOrder}</td>
                    <td className={tdCls}>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                          game.isActive
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-gray-100 text-gray-500 ring-gray-200"
                        }`}
                      >
                        {game.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/games?edit=${game.id}`}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-accent-orange"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Link>
                        <ActionForm
                          action={deleteGameAction}
                          submitLabel="Delete"
                          confirm={`Delete ${game.name}?`}
                          hideButton
                        >
                          <input type="hidden" name="id" value={game.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </ActionForm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {games.length === 0 && (
            <EmptyState icon={Gamepad2} title="No games yet" description="Create your first game from the form." />
          )}
        </Card>

        <Card title={editing ? `Edit ${editing.name}` : "Create game"} icon={editing ? Pencil : Plus}>
          <ActionForm
            action={saveGameAction}
            submitLabel={editing ? "Save game" : "Create game"}
            className="space-y-4"
          >
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <Field label="Name">
              <input name="name" defaultValue={editing?.name} required className={inputCls} />
            </Field>
            <Field label="Slug" hint="Leave blank to generate from the name.">
              <input name="slug" defaultValue={editing?.slug} placeholder="mobile-legends" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <ImageField label="Game image" name="image" defaultValue={editing?.image ?? ""} />
              <ImageField label="Small icon" name="icon" defaultValue={editing?.icon ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Regional variant of" hint="Leave empty for a top-level game.">
                <select name="parentId" defaultValue={editing?.parentId ?? ""} className={selectCls}>
                  <option value="">None (top-level game)</option>
                  {topLevelGames.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Region" hint="e.g. Global or Korea. Required for regional variants.">
                <input name="region" defaultValue={editing?.region ?? ""} className={inputCls} />
              </Field>
            </div>
            <Field label="Description">
              <textarea name="description" defaultValue={editing?.description ?? ""} rows={2} className={textareaCls} />
            </Field>
            <Field label="Top-up instructions" hint="Shown on the product page.">
              <textarea
                name="instructions"
                defaultValue={editing?.instructions ?? ""}
                rows={3}
                placeholder="How the player should top up"
                className={textareaCls}
              />
            </Field>
            <div className="grid grid-cols-2 items-end gap-3">
              <Field label="Display order">
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={String(editing?.sortOrder ?? 0)}
                  className={inputCls}
                />
              </Field>
              <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={editing ? editing.isActive : true}
                  className="h-4 w-4 accent-orange-500"
                />
                Live on site
              </label>
            </div>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}

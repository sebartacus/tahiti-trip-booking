import { getPermisServerClient } from "./permisServer";

type PermisDb = ReturnType<typeof getPermisServerClient>;

export async function readPermisBlocks(db: PermisDb, day: string | null) {
  const blocks = [];
  for (let offset = 0; ; ) {
    const query = db.from("permis_indisponibilites")
      .select("date_debut,date_fin,debut_minute,fin_minute", { count: "exact" });
    const result = await (day
      ? query.lte("date_debut", day).gte("date_fin", day)
      : query.is("debut_minute", null))
      .order("id").range(offset, offset + 999);
    if (result.error) throw result.error;
    blocks.push(...result.data);
    offset += result.data.length;
    if (!result.data.length || offset >= (result.count ?? offset)) return blocks;
  }
}

export async function readPermisBlockedTimes(db: PermisDb, day: string) {
  const blocks = await readPermisBlocks(db, day);
  return blocks.map(block => ({ start: block.debut_minute ?? 0, end: block.fin_minute ?? 1440 }));
}

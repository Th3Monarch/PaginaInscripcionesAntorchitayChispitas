import { redirect } from "next/navigation";
import { InscripcionFlow } from "@/components/InscripcionFlow";
import { isGroupId } from "@/lib/config";

export default async function PaginaInscripcion({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string }>;
}) {
  const { grupo } = await searchParams;
  if (!isGroupId(grupo)) redirect("/");
  return <InscripcionFlow grupo={grupo} />;
}

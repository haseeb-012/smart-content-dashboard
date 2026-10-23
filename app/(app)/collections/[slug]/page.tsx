import { notFound } from "next/navigation";
import { collections } from "@/lib/mock/data";
import { CollectionDetail } from "./collection-detail";

export function generateStaticParams() {
  return collections.map((c) => ({ slug: c.slug }));
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!collections.some((c) => c.slug === slug)) notFound();
  return <CollectionDetail slug={slug} />;
}

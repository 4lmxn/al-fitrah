export default async function LeadDetailPlaceholder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <p>Lead {id}</p>;
}

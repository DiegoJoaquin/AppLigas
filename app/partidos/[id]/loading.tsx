import { Bone, ListSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando partido">
      <Bone className="mb-4 h-4 w-24" />
      <div className="rounded-[24px] bg-mist px-4 py-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-center gap-2"><Bone className="h-16 w-16 rounded-full !bg-line" /><Bone className="h-4 w-20 !bg-line" /></div>
          <Bone className="h-16 w-28 !bg-line" />
          <div className="flex flex-col items-center gap-2"><Bone className="h-16 w-16 rounded-full !bg-line" /><Bone className="h-4 w-20 !bg-line" /></div>
        </div>
      </div>
      <div className="mt-8"><ListSkeleton rows={4} /></div>
    </div>
  );
}

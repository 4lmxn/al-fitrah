import { Icon } from "@/components/ui/Icon";
import { ActionForm } from "@/components/admin/ActionForm";
import { uploadStudentPhotoAction } from "@/app/admin/(dash)/students/actions";

export function StudentPhoto({
  studentId,
  hasPhoto,
  name,
}: {
  studentId: string;
  hasPhoto: boolean;
  name: string;
}) {
  return (
    <div className="shrink-0">
      <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-emerald/8 ring-1 ring-inset ring-emerald/15">
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/admin/students/${studentId}/photo`}
            alt={`Photograph of ${name}`}
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-emerald/40">
            <Icon name="person" className="text-[34px]" />
          </span>
        )}
      </div>

      <ActionForm action={uploadStudentPhotoAction} className="mt-2 w-20">
        <input type="hidden" name="id" value={studentId} />
        <label className="block cursor-pointer rounded-lg px-1 py-1 text-center text-[11px] font-semibold text-emerald transition hover:bg-emerald/8 focus-within:ring-2 focus-within:ring-emerald">
          {hasPhoto ? "Change" : "Add photo"}
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            required
            className="sr-only"
          />
        </label>
        <button
          type="submit"
          className="mt-0.5 w-full rounded-lg bg-emerald/8 py-1 text-[11px] font-semibold text-emerald-deep transition hover:bg-emerald/15"
        >
          Upload
        </button>
      </ActionForm>
    </div>
  );
}

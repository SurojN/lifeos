import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MedicationDraft = {
  name: string;
  instructions: string;
};

type Props = {
  idPrefix: string;
  medications: MedicationDraft[];
  onChange: (medications: MedicationDraft[]) => void;
};

export function MedicationFields({ idPrefix, medications, onChange }: Props) {
  function update(index: number, field: keyof MedicationDraft, value: string) {
    onChange(medications.map((medication, itemIndex) => itemIndex === index ? { ...medication, [field]: value } : medication));
  }

  function remove(index: number) {
    onChange(medications.filter((_, itemIndex) => itemIndex !== index));
  }

  return <fieldset className="grid gap-3 rounded-xl border border-border/80 bg-muted/25 p-4">
    <legend className="px-1 text-sm font-semibold">Medicines listed in the source</legend>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">Copy the wording exactly. Do not add medical advice or assumptions.</p>
      <Button type="button" variant="outline" className="h-9 px-3" onClick={() => onChange([...medications, { name: "", instructions: "" }])} disabled={medications.length >= 50}>
        <Plus className="mr-1.5 size-4"/>Add medicine
      </Button>
    </div>
    {medications.length === 0 ? <p className="text-xs text-muted-foreground">No medicines added.</p> : medications.map((medication, index) => <div key={index} className="grid gap-3 rounded-lg bg-white/70 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
      <label className="text-xs font-medium" htmlFor={`${idPrefix}-medicine-${index}`}>Medicine name
        <input id={`${idPrefix}-medicine-${index}`} value={medication.name} onChange={(event) => update(index, "name", event.target.value)} maxLength={200} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" required />
      </label>
      <label className="text-xs font-medium" htmlFor={`${idPrefix}-instructions-${index}`}>Instructions as written (optional)
        <input id={`${idPrefix}-instructions-${index}`} value={medication.instructions} onChange={(event) => update(index, "instructions", event.target.value)} maxLength={500} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
      </label>
      <Button type="button" variant="ghost" className="h-10 self-end px-3 text-red-700" onClick={() => remove(index)} aria-label={`Remove medicine ${index + 1}`}>
        <Trash2 className="size-4"/>
      </Button>
    </div>)}
  </fieldset>;
}

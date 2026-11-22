import * as S from "@radix-ui/react-switch";

export function Switch({ checked, onCheckedChange, id }: { checked: boolean; onCheckedChange: (v: boolean) => void; id?: string }) {
  return (
    <S.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="relative h-6 w-11 rounded-full border border-border bg-elevated transition-colors data-[state=checked]:border-brand data-[state=checked]:bg-brand"
    >
      <S.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[20px]" />
    </S.Root>
  );
}

type Props = {
  icon: React.ElementType;
  label: string;
};

export default function InfoChip({ icon: Icon, label }: Props) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F5F5F5] rounded-lg text-xs text-[#5B6871]">
      <Icon size={11} />
      {label}
    </span>
  );
}

export const asText = (value: any): string => {
  if (value == null) return '';
  if (typeof value === 'object') {
    const maybeName = (value as any).nombre ?? (value as any).name;
    const maybeId = (value as any).id ?? (value as any)._id;
    return (maybeName ?? maybeId ?? '').toString();
  }
  return String(value);
};



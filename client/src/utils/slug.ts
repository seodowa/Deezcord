export const generateSlug = (name: string) => {
  if (!name) return 'room';
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};
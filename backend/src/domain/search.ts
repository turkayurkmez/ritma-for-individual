export function foldForSearch(s: string): string {
  return s
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

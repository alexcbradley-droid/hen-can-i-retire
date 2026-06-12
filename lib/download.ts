// Shared browser file-download helper.

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); // required by Firefox
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); // Safari needs the URL alive briefly
}

export function slugify(name: string): string {
  return name.replace(/\W+/g, '-').replace(/^-+|-+$/g, '') || 'plan';
}

export { normalizeAutoTitle };

const normalizeAutoTitle = rawTitle => {
  if (!rawTitle || typeof rawTitle !== 'string') {
    return '';
  }
  let title = rawTitle.trim();
  title = title.replace(/^["'“”]+|["'“”]+$/g, '');
  title = title.replace(/\s+/g, ' ');
  title = title.replace(/[。！？!?]+$/g, '');
  if (title.length > 30) {
    title = title.slice(0, 30).trim();
  }
  return title;
};

export const pdfGenerationNormalizeDomainMethods = {
  normalizeMarkdownForPdfText(markdown) {
    const value = String(markdown || '');
    const lines = value.split(/\r?\n/);
    const output = [];

    lines.forEach(line => {
      let text = String(line || '').trim();
      if (!text) {
        output.push('');
        return;
      }
      text = text.replace(/```/g, '');
      text = text.replace(/\*\*(.+?)\*\*/g, '$1');
      text = text.replace(/\*(.+?)\*/g, '$1');
      text = text.replace(/`([^`]+)`/g, '$1');
      output.push(text);
    });

    return output.join('\n');
  }
};

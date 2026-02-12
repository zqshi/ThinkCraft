export const pdfGenerationOptionDomainMethods = {
  buildPdfOptions(exportEntity) {
    const options = exportEntity.options.value;
    const margins = options.margins;
    return {
      format: options.pageSize || 'A4',
      landscape: options.orientation === 'landscape',
      margin: {
        top: `${margins.top}mm`,
        bottom: `${margins.bottom}mm`,
        left: `${margins.left}mm`,
        right: `${margins.right}mm`
      },
      printBackground: true,
      displayHeaderFooter: false,
      headerTemplate: '',
      footerTemplate: ''
    };
  }
};

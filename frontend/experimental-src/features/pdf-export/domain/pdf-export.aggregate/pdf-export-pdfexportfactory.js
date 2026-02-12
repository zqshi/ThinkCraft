export class PdfExportFactory {
  static createFromProject(title, projectId, format, content, options, requestedBy) {
    return PdfExport.create({
      title,
      projectId,
      format,
      content,
      options,
      requestedBy
    });
  }

  static createFromJSON(json) {
    return PdfExport.fromJSON(json);
  }
}

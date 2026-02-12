export class ReportFactory {
  static createDraft(projectId, type, title, description, generatedBy) {
    return Report.create({
      projectId,
      type,
      title,
      description,
      generatedBy
    });
  }

  static createFromJSON(json) {
    return Report.fromJSON(json);
  }
}

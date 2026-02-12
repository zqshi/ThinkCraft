export function registerFilesRoutes(router, deps) {
  const { fs, path, loadProject, ensureProjectWorkspace } = deps;

  router.get('/:projectId/files/download', async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const relativePath = String(req.query.path || '');
      if (!relativePath) {
        return res.status(400).json({ code: -1, error: '缺少文件路径' });
      }

      const project = await loadProject(projectId);
      const workspace = await ensureProjectWorkspace(project);
      const filePath = path.resolve(workspace.projectRoot, relativePath);
      const safeRoot = path.resolve(workspace.projectRoot) + path.sep;
      if (!filePath.startsWith(safeRoot)) {
        return res.status(400).json({ code: -1, error: '非法文件路径' });
      }
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ code: -1, error: '文件不存在' });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  });
}

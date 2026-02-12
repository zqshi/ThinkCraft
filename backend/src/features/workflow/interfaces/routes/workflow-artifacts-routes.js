export function registerArtifactsRoutes(router, deps) {
  const {
    fs,
    path,
    loadProject,
    buildFileTree,
    buildZipBundle,
    runCommand,
    projectRepository,
    ensureProjectWorkspace,
    deleteArtifactPhysicalFile,
    removeArtifactsIndex,
    resolveRepoRoot,
    normalizeStageId,
    resolveProjectStageIds,
    getStageArtifactsFromProject,
    normalizeArtifactsForResponse,
    collectProjectArtifacts
  } = deps;

  router.get('/:projectId/stages/:stageId/artifacts', async (req, res, next) => {
    try {
      const { projectId, stageId } = req.params;
      const normalizedStageId = normalizeStageId(stageId);
      const project = await loadProject(projectId);
      const stageIdsForProject = resolveProjectStageIds(project, normalizedStageId);
      const stageArtifacts = normalizeArtifactsForResponse(
        projectId,
        normalizedStageId,
        stageIdsForProject.flatMap(id => getStageArtifactsFromProject(project, id))
      );

      res.json({ code: 0, data: { stageId: normalizedStageId, artifacts: stageArtifacts } });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:projectId/artifacts', async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const project = await loadProject(projectId);
      const workflow = project.workflow?.toJSON ? project.workflow.toJSON() : project.workflow;
      const workflowStages = Array.isArray(workflow?.stages) ? workflow.stages : [];
      const stageArtifacts = collectProjectArtifacts(workflowStages);

      const allArtifacts = [];
      for (const [stageId, artifactsList] of stageArtifacts.entries()) {
        allArtifacts.push(...normalizeArtifactsForResponse(projectId, stageId, artifactsList));
      }

      res.json({
        code: 0,
        data: {
          total: allArtifacts.length,
          artifacts: allArtifacts
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:projectId/artifacts/tree', async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const maxDepth = Number(req.query.depth || 4);
      const project = await loadProject(projectId);
      const workspace = await ensureProjectWorkspace(project);
      const tree = await buildFileTree(
        workspace.projectRoot,
        workspace.projectRoot,
        0,
        Number.isFinite(maxDepth) ? Math.max(1, maxDepth) : 4
      );

      res.json({
        code: 0,
        data: {
          root: path.relative(resolveRepoRoot(), workspace.projectRoot),
          tree
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:projectId/artifacts/bundle', async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const fresh = req.query.fresh === '1';
      const format = String(req.query.format || 'zip').toLowerCase();
      const project = await loadProject(projectId);
      const workspace = await ensureProjectWorkspace(project);
      const bundleExt = format === 'zip' ? 'zip' : 'tar.gz';
      const bundlePath = path.join(workspace.projectRoot, 'meta', `artifacts.${bundleExt}`);
      const bundleExists = fs.existsSync(bundlePath);

      if (!bundleExists || fresh) {
        if (format === 'zip') {
          try {
            await buildZipBundle(workspace.projectRoot, bundlePath);
          } catch (error) {
            console.warn('[Workflow] zip 打包失败，尝试 tar 兜底:', error);
            const fallbackPath = path.join(workspace.projectRoot, 'meta', 'artifacts.tar.gz');
            const result = await runCommand(
              'tar --exclude=node_modules --exclude=.git --exclude=dist --exclude=build -czf meta/artifacts.tar.gz .',
              {
                cwd: workspace.projectRoot,
                timeoutMs: 10 * 60 * 1000
              }
            );
            if (!result.ok) {
              const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
              return res
                .status(500)
                .json({ code: -1, error: `产物打包失败\n${error.message}\n${output}` });
            }
            res.setHeader(
              'Content-Disposition',
              `attachment; filename="${projectId}-artifacts.tar.gz"`
            );
            return res.sendFile(fallbackPath);
          }
        } else {
          const cmd =
            'tar --exclude=node_modules --exclude=.git --exclude=dist --exclude=build -czf meta/artifacts.tar.gz .';
          const result = await runCommand(cmd, {
            cwd: workspace.projectRoot,
            timeoutMs: 10 * 60 * 1000
          });
          if (!result.ok) {
            const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
            return res.status(500).json({ code: -1, error: `产物打包失败\\n${output}` });
          }
        }
      }

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${projectId}-artifacts.${bundleExt}"`
      );
      res.sendFile(bundlePath);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:projectId/artifacts/:artifactId/file', async (req, res, next) => {
    try {
      const { projectId, artifactId } = req.params;
      const inline = req.query.inline === '1';
      const project = await loadProject(projectId);
      const workflow = project.workflow;
      if (!workflow) {
        return res.status(404).json({ code: -1, error: '项目不存在' });
      }

      let target = null;
      for (const stage of workflow.stages || []) {
        const artifact = stage?.artifacts?.find(a => a.id === artifactId);
        if (artifact) {
          target = artifact;
          break;
        }
      }

      if (!target || !target.relativePath) {
        return res.status(404).json({ code: -1, error: '交付物文件不存在' });
      }

      const repoRoot = resolveRepoRoot();
      const filePath = path.resolve(repoRoot, target.relativePath);
      const safeRoot = path.resolve(repoRoot) + path.sep;
      if (!filePath.startsWith(safeRoot)) {
        return res.status(400).json({ code: -1, error: '非法文件路径' });
      }
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ code: -1, error: '文件不存在' });
      }

      const fileName = target.fileName || path.basename(filePath);
      res.setHeader(
        'Content-Disposition',
        `${inline ? 'inline' : 'attachment'}; filename="${fileName}"`
      );
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:projectId/artifacts/:artifactId', async (req, res, next) => {
    try {
      const { projectId, artifactId } = req.params;
      const project = await loadProject(projectId);
      const workflow = project.workflow;
      if (!workflow) {
        return res.status(404).json({ code: -1, error: '项目不存在' });
      }

      let deleted = false;
      let removedArtifact = null;
      const stages = workflow.stages || [];
      for (const stage of stages) {
        const found = stage?.artifacts?.find(a => a.id === artifactId);
        if (found) {
          removedArtifact = found;
          deleted = workflow.removeArtifact(stage.id, artifactId);
          break;
        }
      }

      if (!deleted) {
        return res.status(404).json({ code: -1, error: '交付物不存在' });
      }

      const physicalDelete = await deleteArtifactPhysicalFile(project, {
        artifactId,
        relativePath: removedArtifact?.relativePath
      });
      if (!physicalDelete?.ok) {
        return res.status(500).json({
          code: -1,
          error: '交付物文件物理删除失败，请重试'
        });
      }

      await projectRepository.save(project);
      await removeArtifactsIndex(project, artifactId).catch(() => {});

      res.json({ code: 0, message: '交付物已删除' });
    } catch (error) {
      next(error);
    }
  });
}

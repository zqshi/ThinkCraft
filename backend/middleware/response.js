/**
 * API响应格式统一封装
 */

export function ok(res, data = null, message = 'ok') {
  return res.json({
    code: 0,
    message,
    data
  });
}

export function fail(res, message, status = 400, details = null, code = -1) {
  return res.status(status).json({
    code,
    error: message,
    ...(details !== null ? { details } : {})
  });
}

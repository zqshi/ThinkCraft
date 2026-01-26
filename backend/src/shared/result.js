export function ok(data) {
  return { ok: true, data };
}

export function fail(error, status = 500, rawResponse = null) {
  return { ok: false, error, status, rawResponse };
}

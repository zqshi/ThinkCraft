import { validationResult } from 'express-validator';

export { validateRequest };

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      code: -1,
      error: '请求参数验证失败',
      details: errors.array()
    });
  }
  next();
};
